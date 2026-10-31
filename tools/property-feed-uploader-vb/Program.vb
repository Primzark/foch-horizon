Option Strict On
Option Explicit On
Option Infer On

Imports System
Imports System.IO
Imports System.IO.Compression
Imports System.Linq
Imports System.Net
Imports System.Net.Http
Imports System.Text
Imports System.Text.Json
Imports System.Threading.Tasks

Module Program
    Private Const DefaultEndpoint As String = "https://rcrulfdobtmfxzpuyryn.supabase.co/functions/v1/property-feed-import"
    Private Const MaximumFeedBytes As Long = 8000000
    Private ReadOnly Http As New HttpClient With {
        .Timeout = TimeSpan.FromSeconds(120)
    }
    Private ReadOnly JsonOptions As New JsonSerializerOptions With {
        .PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        .WriteIndented = True
    }

    Public Function Main(args As String()) As Integer
        Return MainAsync(args).GetAwaiter().GetResult()
    End Function

    Private Async Function MainAsync(args As String()) As Task(Of Integer)
        Dim logEntries As New List(Of LogInfo)()
        Dim exitCode As Integer = 0

        Try
            Dim options As RunOptions = ParseOptions(args)
            If options.ShowHelp Then
                PrintUsage()
                Return 0
            End If

            Dim zipPath As String = options.ZipPath
            Dim autoSelectedZip As Boolean = String.IsNullOrWhiteSpace(zipPath)
            If autoSelectedZip Then
                Dim zipDirectory As String = If(String.IsNullOrWhiteSpace(options.ZipDirectory),
                    AppContext.BaseDirectory,
                    Path.GetFullPath(options.ZipDirectory.Trim().Trim(ChrW(34))))
                If Not Directory.Exists(zipDirectory) Then
                    Throw New DirectoryNotFoundException($"ZIP search directory does not exist: {zipDirectory}")
                End If

                Dim zipFiles As String() = Directory.GetFiles(zipDirectory).
                    Where(Function(filePath) String.Equals(Path.GetExtension(filePath), ".zip", StringComparison.OrdinalIgnoreCase)).
                    ToArray()
                If zipFiles.Length = 0 Then
                    Throw New FileNotFoundException($"No ZIP file was found in the search directory: {zipDirectory}")
                End If
                If zipFiles.Length > 1 Then
                    Dim fileNames As String = String.Join(", ", zipFiles.Select(Function(filePath) Path.GetFileName(filePath)))
                    Throw New ArgumentException($"More than one ZIP file was found in {zipDirectory} ({fileNames}). Specify one ZIP file path explicitly.")
                End If

                zipPath = zipFiles(0)
            Else
                zipPath = Path.GetFullPath(zipPath.Trim().Trim(ChrW(34)))
            End If

            If Not File.Exists(zipPath) Then Throw New FileNotFoundException("ZIP file not found.", zipPath)

            logEntries.Add(New LogInfo(True, "Start", "ZIP import started."))
            If autoSelectedZip Then
                logEntries.Add(New LogInfo(True, "Input", $"Automatically selected ZIP: {zipPath}."))
                Console.WriteLine($"Using ZIP: {zipPath}")
            End If

            Dim extractDirectory As String = Path.Combine(Directory.GetCurrentDirectory(), "Unzip")
            Directory.CreateDirectory(extractDirectory)
            Dim csvPath As String = Path.Combine(extractDirectory, "Annonces.csv")
            ExtractAnnoncesCsv(zipPath, csvPath)
            logEntries.Add(New LogInfo(True, "ExtractZip", "Extracted Annonces.csv."))

            Dim buildResult As FeedBuildResult = LegacyCsvFeedBuilder.BuildFromFile(csvPath)
            logEntries.Add(New LogInfo(True, "ParseCSVSrc", $"Parsed {buildResult.Feed.Properties.Count} property rows using delimiter '{buildResult.Delimiter}'."))
            For Each warning As String In buildResult.Warnings
                logEntries.Add(New LogInfo(True, "Warning", warning))
                Console.WriteLine($"Warning: {warning}")
            Next

            Dim feedJson As String = JsonSerializer.Serialize(buildResult.Feed, JsonOptions)
            Dim feedSize As Long = Encoding.UTF8.GetByteCount(feedJson)
            If feedSize > MaximumFeedBytes Then Throw New ArgumentException("The generated JSON feed exceeds the import function's 8 MB limit.")

            Dim outputPath As String = If(String.IsNullOrWhiteSpace(options.OutputPath),
                Path.Combine(Directory.GetCurrentDirectory(), "Prod", "Annonces.json"),
                Path.GetFullPath(options.OutputPath))
            Dim outputDirectory As String = Path.GetDirectoryName(outputPath)
            If Not String.IsNullOrWhiteSpace(outputDirectory) Then Directory.CreateDirectory(outputDirectory)
            File.WriteAllText(outputPath, feedJson & Environment.NewLine, New UTF8Encoding(False))
            logEntries.Add(New LogInfo(True, "CreateJSONFile", $"Wrote {buildResult.Feed.Properties.Count} listings to {outputPath}."))

            Console.WriteLine($"Converted {buildResult.Feed.Properties.Count} listings to {outputPath}.")
            If options.DryRun Then
                logEntries.Add(New LogInfo(True, "DryRun", "Local validation completed; no Supabase request was sent."))
                Console.WriteLine("Dry run complete. No Supabase request was sent.")
                Return 0
            End If

            Dim endpointText As String = Environment.GetEnvironmentVariable("PROPERTY_FEED_IMPORT_ENDPOINT")
            If String.IsNullOrWhiteSpace(endpointText) Then endpointText = DefaultEndpoint
            Dim endpoint As Uri = ValidateEndpoint(endpointText.Trim())

            Dim apiKey As String = ReadSettingOrSecret(
                {"SUPABASE_API_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY"},
                "Supabase publishable/anon API key: ")
            Dim importToken As String = ReadSettingOrSecret(
                {"PROPERTY_FEED_IMPORT_TOKEN"},
                "Property feed import token: ")

            Using request As New HttpRequestMessage(HttpMethod.Post, endpoint)
                request.Headers.Add("apikey", apiKey)
                request.Headers.Add("x-property-import-token", importToken)
                If options.SkipAlertDispatch Then request.Headers.Add("x-property-feed-skip-alert-dispatch", "true")
                request.Content = New StringContent(feedJson, New UTF8Encoding(False), "application/json")

                Console.WriteLine("Sending feed to Supabase...")
                Using response As HttpResponseMessage = Await Http.SendAsync(request).ConfigureAwait(False)
                    Dim responseBody As String = Await response.Content.ReadAsStringAsync().ConfigureAwait(False)
                    If Not response.IsSuccessStatusCode Then
                        Dim detail As String = If(String.IsNullOrWhiteSpace(responseBody), String.Empty, $": {responseBody}")
                        Throw New HttpRequestException($"Import failed: HTTP {CInt(response.StatusCode)} {response.ReasonPhrase}{detail}")
                    End If

                    logEntries.Add(New LogInfo(True, "UploadFile", $"Supabase accepted {buildResult.Feed.Properties.Count} listings."))
                    Console.WriteLine("Feed imported successfully.")
                    If Not String.IsNullOrWhiteSpace(responseBody) Then Console.WriteLine(responseBody)
                End Using
            End Using
        Catch ex As FileNotFoundException
            exitCode = 2
            logEntries.Add(New LogInfo(False, "Input", ex.Message))
            Console.Error.WriteLine(ex.Message)
        Catch ex As JsonException
            exitCode = 2
            logEntries.Add(New LogInfo(False, "CreateJSONFile", ex.Message))
            Console.Error.WriteLine($"Could not create a valid property feed: {ex.Message}")
        Catch ex As HttpRequestException
            exitCode = 1
            logEntries.Add(New LogInfo(False, "UploadFile", ex.Message))
            Console.Error.WriteLine(ex.Message)
        Catch ex As IOException
            exitCode = 2
            logEntries.Add(New LogInfo(False, "FileIO", ex.Message))
            Console.Error.WriteLine(ex.Message)
        Catch ex As ArgumentException
            exitCode = 2
            logEntries.Add(New LogInfo(False, "Input", ex.Message))
            Console.Error.WriteLine(ex.Message)
        Catch ex As Exception
            exitCode = 1
            logEntries.Add(New LogInfo(False, If(ex.TargetSite Is Nothing, "Import", ex.TargetSite.Name), ex.Message))
            Console.Error.WriteLine($"Import failed: {ex.Message}")
        Finally
            WriteLogFile(logEntries)
        End Try

        Return exitCode
    End Function

    Private Function ParseOptions(args As String()) As RunOptions
        Dim options As New RunOptions()
        Dim index As Integer = 0

        While index < args.Length
            Dim argument As String = args(index)
            If String.Equals(argument, "--dry-run", StringComparison.OrdinalIgnoreCase) Then
                options.DryRun = True
            ElseIf String.Equals(argument, "--zip-dir", StringComparison.OrdinalIgnoreCase) Then
                index += 1
                If index >= args.Length OrElse String.IsNullOrWhiteSpace(args(index)) Then
                    Throw New ArgumentException("--zip-dir must be followed by a directory path.")
                End If
                options.ZipDirectory = args(index)
            ElseIf String.Equals(argument, "--output", StringComparison.OrdinalIgnoreCase) Then
                index += 1
                If index >= args.Length OrElse String.IsNullOrWhiteSpace(args(index)) Then
                    Throw New ArgumentException("--output must be followed by a JSON file path.")
                End If
                options.OutputPath = args(index)
            ElseIf String.Equals(argument, "--skip-alert-dispatch", StringComparison.OrdinalIgnoreCase) Then
                options.SkipAlertDispatch = True
            ElseIf String.Equals(argument, "--help", StringComparison.OrdinalIgnoreCase) OrElse String.Equals(argument, "-h", StringComparison.OrdinalIgnoreCase) Then
                options.ShowHelp = True
            ElseIf argument.StartsWith("--", StringComparison.Ordinal) Then
                Throw New ArgumentException($"Unknown option: {argument}")
            ElseIf String.IsNullOrWhiteSpace(options.ZipPath) Then
                options.ZipPath = argument
            Else
                Throw New ArgumentException("Provide one ZIP path or use --zip-dir <directory>, optionally followed by --dry-run and/or --output <path>.")
            End If
            index += 1
        End While

        If Not String.IsNullOrWhiteSpace(options.ZipPath) AndAlso Not String.IsNullOrWhiteSpace(options.ZipDirectory) Then
            Throw New ArgumentException("Use either a ZIP file path or --zip-dir, not both.")
        End If

        Return options
    End Function

    Private Sub ExtractAnnoncesCsv(zipPath As String, csvPath As String)
        Using archive As ZipArchive = ZipFile.OpenRead(zipPath)
            Dim matchingEntries = archive.Entries.Where(Function(entry) String.Equals(
                Path.GetFileName(entry.FullName.Replace("\", "/")), "Annonces.csv", StringComparison.OrdinalIgnoreCase)).ToArray()

            If matchingEntries.Length = 0 Then Throw New FileNotFoundException("The ZIP archive does not contain Annonces.csv.")
            If matchingEntries.Length > 1 Then Throw New InvalidDataException("The ZIP archive contains more than one Annonces.csv file.")
            If matchingEntries(0).Length <= 0 Then Throw New InvalidDataException("Annonces.csv is empty.")
            If matchingEntries(0).Length > MaximumFeedBytes Then Throw New InvalidDataException("Annonces.csv exceeds the 8 MB import limit.")

            Using input As Stream = matchingEntries(0).Open()
                Using output As New FileStream(csvPath, FileMode.Create, FileAccess.Write, FileShare.None)
                    input.CopyTo(output)
                End Using
            End Using
        End Using
    End Sub

    Private Function ValidateEndpoint(endpointText As String) As Uri
        Dim endpoint As Uri = Nothing
        If Not Uri.TryCreate(endpointText, UriKind.Absolute, endpoint) Then
            Throw New ArgumentException("The import endpoint must be an absolute URL.")
        End If

        Dim isHttps As Boolean = String.Equals(endpoint.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase)
        Dim isLocalHttp As Boolean = String.Equals(endpoint.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase) AndAlso endpoint.IsLoopback
        If Not isHttps AndAlso Not isLocalHttp Then
            Throw New ArgumentException("Use an HTTPS endpoint (HTTP is allowed only for localhost testing).")
        End If

        Return endpoint
    End Function

    Private Function ReadSettingOrSecret(environmentNames As String(), prompt As String) As String
        For Each environmentName As String In environmentNames
            Dim value As String = Environment.GetEnvironmentVariable(environmentName)
            If Not String.IsNullOrWhiteSpace(value) Then Return value.Trim()
        Next

        Dim secret As String = ReadSecret(prompt).Trim()
        If secret.Length = 0 Then Throw New ArgumentException("A required Supabase credential was not provided.")
        Return secret
    End Function

    Private Function ReadSecret(prompt As String) As String
        Console.Write(prompt)
        Dim characters As New StringBuilder()

        While True
            Dim key As ConsoleKeyInfo = Console.ReadKey(True)
            If key.Key = ConsoleKey.Enter Then Exit While
            If key.Key = ConsoleKey.Backspace Then
                If characters.Length > 0 Then characters.Length -= 1
            ElseIf Not Char.IsControl(key.KeyChar) Then
                characters.Append(key.KeyChar)
            End If
        End While

        Console.WriteLine()
        Return characters.ToString()
    End Function

    Private Sub WriteLogFile(entries As List(Of LogInfo))
        If entries.Count = 0 Then Return
        Try
            Dim logDate As String = DateTime.Now.ToString("ddMMyyyy_Hmm", Globalization.CultureInfo.InvariantCulture)
            Dim logPath As String = Path.Combine(Directory.GetCurrentDirectory(), $"Fochimmo_{logDate}.txt")
            Using writer As New StreamWriter(logPath, False, New UTF8Encoding(False))
                For Each entry As LogInfo In entries
                    writer.WriteLine(entry.CsvLine)
                Next
            End Using
            Console.WriteLine($"Log written to {logPath}.")
        Catch ex As Exception
            Console.Error.WriteLine($"Could not write the log file: {ex.Message}")
        End Try
    End Sub

    Private Sub PrintUsage()
        Console.WriteLine("Usage: Fochimmo [<path-to-zip> | --zip-dir <directory>] [--dry-run] [--skip-alert-dispatch] [--output <path-to-json>]")
        Console.WriteLine("If no ZIP path or directory is supplied, Fochimmo uses the only .zip file beside the executable.")
        Console.WriteLine("--zip-dir searches the named directory for exactly one .zip file.")
        Console.WriteLine("The ZIP must contain one Annonces.csv file. Without --dry-run, the feed is upserted through the Foch Supabase import function.")
        Console.WriteLine("--skip-alert-dispatch suppresses post-import alert and confirmation emails for this run.")
        Console.WriteLine("Credentials: SUPABASE_API_KEY (or SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY) and PROPERTY_FEED_IMPORT_TOKEN.")
        Console.WriteLine("Set PROPERTY_FEED_IMPORT_ENDPOINT to override the default HTTPS endpoint.")
    End Sub

    Private Class RunOptions
        Public Property ZipPath As String = String.Empty
        Public Property ZipDirectory As String = String.Empty
        Public Property OutputPath As String = String.Empty
        Public Property DryRun As Boolean
        Public Property SkipAlertDispatch As Boolean
        Public Property ShowHelp As Boolean
    End Class

    Private Structure LogInfo
        Public ReadOnly Property Ok As Boolean
        Public ReadOnly Property FuncName As String
        Public ReadOnly Property ErrMsg As String

        Public ReadOnly Property CsvLine As String
            Get
                Return String.Format(Globalization.CultureInfo.InvariantCulture, "{0};{1};{2};{3}", If(Ok, "OK", "KO"), FuncName, DateTime.Now, ErrMsg)
            End Get
        End Property

        Public Sub New(ok As Boolean, funcName As String, errMsg As String)
            Me.Ok = ok
            Me.FuncName = funcName
            Me.ErrMsg = errMsg.Replace(ControlChars.Cr, " ").Replace(ControlChars.Lf, " ")
        End Sub
    End Structure
End Module
