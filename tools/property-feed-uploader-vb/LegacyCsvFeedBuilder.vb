Option Strict On
Option Explicit On
Option Infer On

Imports System
Imports System.Collections.Generic
Imports System.Globalization
Imports System.IO
Imports System.Linq
Imports System.Net
Imports System.Text
Imports System.Text.Json.Serialization
Imports System.Text.RegularExpressions

Public NotInheritable Class LegacyCsvFeedBuilder
    Private Const SourceDelimiterPrimary As String = "!#"
    Private Const SourceDelimiterAlternate As String = ";#"

    'The legacy CSV has no header row. These positions mirror the Fields enum
    'in the supplied Fochimmo Module1.vb (zero-based indexes).
    Private Const RefIndex As Integer = 1
    Private Const CategoryIndex As Integer = 2
    Private Const PropertyTypeIndex As Integer = 3
    Private Const PostalCodeIndex As Integer = 4
    Private Const CityIndex As Integer = 5
    Private Const CountryIndex As Integer = 6
    Private Const NearbyIndex As Integer = 8
    Private Const PriceIndex As Integer = 10
    Private Const FeesIndex As Integer = 14
    Private Const SurfaceIndex As Integer = 15
    Private Const LandIndex As Integer = 16
    Private Const RoomsIndex As Integer = 17
    Private Const BedroomsIndex As Integer = 18
    Private Const TitleIndex As Integer = 19
    Private Const DescriptionIndex As Integer = 20
    Private Const AvailableDateIndex As Integer = 21
    Private Const MonthlyChargesIndex As Integer = 22
    Private Const FloorIndex As Integer = 23
    Private Const FloorsIndex As Integer = 24
    Private Const YearBuiltIndex As Integer = 26
    Private Const BathroomsIndex As Integer = 28
    Private Const ShowerRoomsIndex As Integer = 29
    Private Const ToiletsIndex As Integer = 30
    Private Const SeparateToiletIndex As Integer = 31
    Private Const HeatingIndex As Integer = 32
    Private Const BalconiesIndex As Integer = 38
    Private Const ElevatorIndex As Integer = 40
    Private Const CellarIndex As Integer = 41
    Private Const ParkingIndex As Integer = 42
    Private Const GarageIndex As Integer = 43
    Private Const FeaturedIndex As Integer = 83
    Private Const FirstImageIndex As Integer = 84
    Private Const LastImageIndex As Integer = 92
    Private Const FirstImageTitleIndex As Integer = 93
    Private Const DpeValueIndex As Integer = 175
    Private Const DpeLabelIndex As Integer = 176
    Private Const GesValueIndex As Integer = 177
    Private Const GesLabelIndex As Integer = 178

    Private Sub New()
    End Sub

    Public Shared Function BuildFromFile(csvPath As String) As FeedBuildResult
        Dim bytes As Byte() = File.ReadAllBytes(csvPath)
        Dim content As String = DecodeCsv(bytes)
        Dim delimiter As String = DetectDelimiter(content)
        Dim rows As List(Of String()) = ParseCsv(content, delimiter)
        If rows.Count = 0 Then Throw New InvalidDataException("Annonces.csv contains no records.")

        Dim headerRow As Boolean = IsHeaderRow(rows(0))
        Dim statusIndex As Integer = If(headerRow, FindColumn(rows(0), {"statut", "status"}), -1)
        If headerRow Then rows.RemoveAt(0)

        Dim warnings As New List(Of String)()
        Dim propertyIds As Integer() = NormalizePropertyReferences(rows, warnings)
        Dim uniqueRows As New List(Of String())()
        Dim uniquePropertyIds As New List(Of Integer)()
        For rowIndex As Integer = 0 To rows.Count - 1
            If propertyIds(rowIndex) <= 0 Then Continue For
            uniqueRows.Add(rows(rowIndex))
            uniquePropertyIds.Add(propertyIds(rowIndex))
        Next
        rows = uniqueRows
        propertyIds = uniquePropertyIds.ToArray()

        Dim sourceCities As New Dictionary(Of String, String)(StringComparer.Ordinal)
        For Each row As String() In rows
            Dim cityName As String = Cell(row, CityIndex)
            If cityName.Length > 0 Then AddCanonicalCity(sourceCities, cityName)
        Next

        Dim propertyRows As New List(Of ImportedProperty)()
        Dim cityRows As New Dictionary(Of String, ImportedCity)(StringComparer.Ordinal)
        Dim agentsById As New Dictionary(Of String, ImportedAgent)(StringComparer.Ordinal)
        Dim generatedAt As String = DateTimeOffset.UtcNow.ToString("O", CultureInfo.InvariantCulture)

        For rowNumber As Integer = 0 To rows.Count - 1
            Dim row As String() = rows(rowNumber)
            If row.All(Function(value) String.IsNullOrWhiteSpace(value)) Then Continue For

            Dim id As Integer = propertyIds(rowNumber)

            Dim category As String = Cell(row, CategoryIndex)
            Dim transactionType As String = ParseTransactionType(category, id)
            Dim rawType As String = Cell(row, PropertyTypeIndex)
            Dim propertyType As String = ParsePropertyType(rawType)
            Dim cityName As String = Cell(row, CityIndex)
            If cityName.Length = 0 Then
                cityName = InferCity(Cell(row, NearbyIndex), Cell(row, TitleIndex), Cell(row, DescriptionIndex), sourceCities)
                If cityName.Length = 0 Then
                    Throw New InvalidDataException($"Property {id} has no city and no city could be inferred from its source text.")
                End If
                warnings.Add($"Property {id}: city was inferred as {cityName} from the description because the CSV city field was empty.")
            Else
                cityName = CanonicalCity(sourceCities, cityName)
            End If

            Dim postalCode As String = Cell(row, PostalCodeIndex)
            Dim cityKey As String = NormalizeKey(cityName)
            Dim citySlug As String = Slugify(cityName)
            Dim cityId As String = "city-" & citySlug
            Dim city As ImportedCity = Nothing
            If Not cityRows.TryGetValue(cityKey, city) Then
                city = New ImportedCity With {
                    .Id = cityId,
                    .Name = cityName,
                    .Slug = citySlug,
                    .PostalCodes = New List(Of String)(),
                    .IsActive = True
                }
                cityRows.Add(cityKey, city)
            End If
            If postalCode.Length > 0 AndAlso Not city.PostalCodes.Contains(postalCode, StringComparer.Ordinal) Then city.PostalCodes.Add(postalCode)

            Dim title As String = Cell(row, TitleIndex)
            If title.Length = 0 Then
                title = DefaultTitle(rawType, cityName)
                warnings.Add($"Property {id}: the source title was empty; generated '{title}'.")
            End If

            Dim explicitStatus As String = ReadExplicitStatus(row, statusIndex)
            Dim statut As String = If(explicitStatus.Length > 0, explicitStatus, If(transactionType = "location", "A LOUER", "A VENDRE"))
            Dim databaseStatus As String = ToDatabaseStatus(statut)
            Dim price As Decimal = ParseDecimal(Cell(row, PriceIndex), $"price for property {id}")
            If price < 0D Then Throw New InvalidDataException($"Property {id} has a negative price.")

            Dim surface As Decimal = ParseOptionalDecimal(Cell(row, SurfaceIndex), 0D)
            Dim landSurface As Decimal? = ParseOptionalDecimalNullable(Cell(row, LandIndex))
            Dim rooms As Integer = ParseOptionalInteger(Cell(row, RoomsIndex), 0)
            Dim bedrooms As Integer = ParseOptionalInteger(Cell(row, BedroomsIndex), 0)
            Dim bathrooms As Integer = ParseOptionalInteger(Cell(row, BathroomsIndex), 0) + ParseOptionalInteger(Cell(row, ShowerRoomsIndex), 0)
            Dim parkingCount As Integer = ParseOptionalInteger(Cell(row, ParkingIndex), 0)
            Dim garageCount As Integer = ParseOptionalInteger(Cell(row, GarageIndex), 0)
            Dim description As String = CleanDescription(Cell(row, DescriptionIndex))
            Dim featured As Boolean = IsYes(Cell(row, FeaturedIndex))
            Dim negotiatorName As String = ExtractNegotiatorName(Cell(row, DescriptionIndex))
            Dim agentId As String = Nothing
            If negotiatorName.Length > 0 Then
                Dim agent As ImportedAgent = ResolveNegotiator(negotiatorName)
                agentId = agent.Id
                If Not agentsById.ContainsKey(agent.Id) Then agentsById.Add(agent.Id, agent)
            End If

            Dim imported As New ImportedProperty With {
                .Id = id,
                .Title = title,
                .Slug = Slugify($"{title}-{id}"),
                .TransactionType = transactionType,
                .PropertyType = propertyType,
                .Status = databaseStatus,
                .SourceStatus = statut,
                .PriceAmount = CInt(Math.Round(price, MidpointRounding.AwayFromZero)),
                .PriceCurrency = "EUR",
                .SurfaceM2 = surface,
                .TerrainM2 = landSurface,
                .Rooms = rooms,
                .Bedrooms = bedrooms,
                .Bathrooms = bathrooms,
                .ParkingCount = parkingCount,
                .GarageCount = garageCount,
                .DpeLabel = NullIfEmpty(Cell(row, DpeLabelIndex)),
                .DpeValue = ParseOptionalDecimalNullable(Cell(row, DpeValueIndex)),
                .GesLabel = NullIfEmpty(Cell(row, GesLabelIndex)),
                .GesValue = ParseOptionalDecimalNullable(Cell(row, GesValueIndex)),
                .Description = NullIfEmpty(description),
                .CityId = cityId,
                .PostalCode = NullIfEmpty(postalCode),
                .Latitude = Nothing,
                .Longitude = Nothing,
                .AgentId = agentId,
                .PublishedAt = Nothing,
                .UpdatedAt = generatedAt,
                .IsFeatured = featured,
                .Images = BuildImages(row, id, title),
                .Features = BuildFeatures(row, id),
                .SourceDetails = BuildSourceDetails(row, negotiatorName)
            }
            propertyRows.Add(imported)
        Next

        If propertyRows.Count = 0 Then Throw New InvalidDataException("Annonces.csv contains no property listings.")
        If propertyRows.Count > 250 Then Throw New InvalidDataException("The Supabase import function accepts no more than 250 listings per feed.")

        Dim feed As New PropertyImportFeed With {
            .SchemaVersion = 1,
            .GeneratedAt = generatedAt,
            .Properties = propertyRows,
            .Cities = cityRows.Values.OrderBy(Function(city) city.Slug, StringComparer.Ordinal).ToList(),
            .Agents = agentsById.Values.OrderBy(Function(agent) agent.Id, StringComparer.Ordinal).ToList()
        }

        Return New FeedBuildResult With {
            .Feed = feed,
            .Delimiter = delimiter,
            .Warnings = warnings
        }
    End Function

    Private Shared Function NormalizePropertyReferences(rows As List(Of String()), warnings As List(Of String)) As Integer()
        Dim normalizedIds As Integer() = New Integer(rows.Count - 1) {}
        Dim firstRowByReference As New Dictionary(Of Integer, Integer)()

        For rowIndex As Integer = 0 To rows.Count - 1
            Dim rawReference As String = Cell(rows(rowIndex), RefIndex)
            Dim trimmedReference As String = rawReference.Trim()
            Dim numericReference As String = trimmedReference
            Dim hadTrailingPeriod As Boolean = trimmedReference.EndsWith(".", StringComparison.Ordinal)
            If hadTrailingPeriod Then numericReference = trimmedReference.Substring(0, trimmedReference.Length - 1)

            Dim id As Integer
            If Not Integer.TryParse(numericReference, NumberStyles.Integer, CultureInfo.InvariantCulture, id) OrElse id <= 0 Then
                Throw New InvalidDataException($"CSV record {rowIndex + 1} has an invalid property reference.")
            End If

            Dim firstRow As Integer
            If firstRowByReference.TryGetValue(id, firstRow) Then
                warnings.Add($"CSV record {rowIndex + 1}: duplicate property reference {id}; kept the first occurrence at record {firstRow + 1} and skipped this row.")
                Continue For
            End If

            firstRowByReference.Add(id, rowIndex)
            normalizedIds(rowIndex) = id
            If hadTrailingPeriod Then
                warnings.Add($"CSV record {rowIndex + 1}: removed the trailing period from property reference '{rawReference}' and used {id}.")
            End If
        Next

        Return normalizedIds
    End Function

    Private Shared Function ExtractNegotiatorName(description As String) As String
        If String.IsNullOrWhiteSpace(description) Then Return String.Empty

        Dim decoded As String = WebUtility.HtmlDecode(description)
        Dim match As Match = Regex.Match(
            decoded,
            "\bAgent\s+(?:commercial|co)\b\s*[:.\-]?\s*(?<name>[^<\r\n]+)",
            RegexOptions.IgnoreCase Or RegexOptions.CultureInvariant)
        If Not match.Success Then Return String.Empty

        Dim name As String = Regex.Replace(match.Groups("name").Value, "\s+", " ").Trim(" "c, "."c, ","c, ";"c, ":"c)
        Return name
    End Function

    Private Shared Function ResolveNegotiator(name As String) As ImportedAgent
        Dim normalizedName As String = NormalizeAgentName(name)
        Select Case normalizedName
            ' These source names map to the stable IDs already used by the website.
            Case "alain durame"
                Return New ImportedAgent With {.Id = "agent-jeanne-morel", .FullName = "Alain DURAME", .Role = "Transactions"}
            Case "emma vasselin"
                Return New ImportedAgent With {.Id = "agent-lucas-bernard", .FullName = "Emma VASSELIN", .Role = "Transactions"}
            Case "veronique fogt"
                Return New ImportedAgent With {.Id = "agent-clara-durand", .FullName = "Véronique FOGT", .Role = "Transactions"}
            Case "dries hubert"
                Return New ImportedAgent With {.Id = "agent-dries-hubert", .FullName = "Dries HUBERT", .Role = "Transactions et administration de biens"}
            Case Else
                Return New ImportedAgent With {
                    .Id = "source-agent-" & Slugify(normalizedName),
                    .FullName = Regex.Replace(name.Trim(), "\s+", " "),
                    .Role = "Transactions"
                }
        End Select
    End Function

    Private Shared Function NormalizeAgentName(value As String) As String
        Dim decomposed As String = value.Normalize(NormalizationForm.FormD)
        Dim withoutDiacritics As String = New String(decomposed.Where(Function(character) CharUnicodeInfo.GetUnicodeCategory(character) <> UnicodeCategory.NonSpacingMark).ToArray())
        Return Regex.Replace(withoutDiacritics.ToLowerInvariant(), "\s+", " ").Trim()
    End Function

    Private Shared Function DecodeCsv(bytes As Byte()) As String
        Dim offset As Integer = If(bytes.Length >= 3 AndAlso bytes(0) = &HEF AndAlso bytes(1) = &HBB AndAlso bytes(2) = &HBF, 3, 0)
        Dim utf8 As New UTF8Encoding(False, True)
        Try
            Return utf8.GetString(bytes, offset, bytes.Length - offset)
        Catch ex As DecoderFallbackException
            Encoding.RegisterProvider(CodePagesEncodingProvider.Instance)
            Return Encoding.GetEncoding(1252, EncoderFallback.ExceptionFallback, DecoderFallback.ReplacementFallback).GetString(bytes)
        End Try
    End Function

    Private Shared Function DetectDelimiter(content As String) As String
        Dim primaryCount As Integer = 0
        Dim alternateCount As Integer = 0
        Dim quoted As Boolean = False
        Dim index As Integer = 0

        While index < content.Length
            Dim current As Char = content(index)
            If current = """"c Then
                If quoted AndAlso index + 1 < content.Length AndAlso content(index + 1) = """"c Then
                    index += 2
                    Continue While
                End If
                quoted = Not quoted
            ElseIf Not quoted Then
                If current = ControlChars.Cr OrElse current = ControlChars.Lf Then Exit While
                If MatchesAt(content, SourceDelimiterPrimary, index) Then
                    primaryCount += 1
                    index += SourceDelimiterPrimary.Length
                    Continue While
                End If
                If MatchesAt(content, SourceDelimiterAlternate, index) Then
                    alternateCount += 1
                    index += SourceDelimiterAlternate.Length
                    Continue While
                End If
            End If
            index += 1
        End While

        If primaryCount = 0 AndAlso alternateCount = 0 Then Throw New InvalidDataException("Could not detect the CSV separator. Expected '!#' or ';#'.")
        Return If(primaryCount >= alternateCount, SourceDelimiterPrimary, SourceDelimiterAlternate)
    End Function

    Private Shared Function ParseCsv(content As String, delimiter As String) As List(Of String())
        Dim rows As New List(Of String())()
        Dim fields As New List(Of String)()
        Dim field As New StringBuilder()
        Dim quoted As Boolean = False
        Dim index As Integer = 0

        While index < content.Length
            Dim current As Char = content(index)
            If current = """"c Then
                If quoted AndAlso index + 1 < content.Length AndAlso content(index + 1) = """"c Then
                    field.Append(""""c)
                    index += 2
                    Continue While
                End If
                quoted = Not quoted
                index += 1
                Continue While
            End If

            If Not quoted AndAlso MatchesAt(content, delimiter, index) Then
                fields.Add(field.ToString())
                field.Clear()
                index += delimiter.Length
                Continue While
            End If

            If Not quoted AndAlso (current = ControlChars.Cr OrElse current = ControlChars.Lf) Then
                fields.Add(field.ToString())
                If fields.Any(Function(value) Not String.IsNullOrWhiteSpace(value)) Then rows.Add(fields.ToArray())
                fields.Clear()
                field.Clear()
                If current = ControlChars.Cr AndAlso index + 1 < content.Length AndAlso content(index + 1) = ControlChars.Lf Then index += 1
                index += 1
                Continue While
            End If

            field.Append(current)
            index += 1
        End While

        If quoted Then Throw New InvalidDataException("Annonces.csv has an unterminated quoted field.")
        If field.Length > 0 OrElse fields.Count > 0 Then
            fields.Add(field.ToString())
            If fields.Any(Function(value) Not String.IsNullOrWhiteSpace(value)) Then rows.Add(fields.ToArray())
        End If
        Return rows
    End Function

    Private Shared Function IsHeaderRow(row As String()) As Boolean
        Dim normalized As HashSet(Of String) = New HashSet(Of String)(row.Select(Function(value) NormalizeKey(value)), StringComparer.Ordinal)
        Dim hasReference As Boolean = normalized.Contains("ref") OrElse normalized.Contains("reference") OrElse normalized.Contains("id")
        Dim hasPrice As Boolean = normalized.Contains("prix") OrElse normalized.Contains("price")
        Return hasReference AndAlso hasPrice
    End Function

    Private Shared Function MatchesAt(content As String, value As String, index As Integer) As Boolean
        Return index >= 0 AndAlso index + value.Length <= content.Length AndAlso
            String.Compare(content, index, value, 0, value.Length, StringComparison.Ordinal) = 0
    End Function

    Private Shared Function FindColumn(header As String(), names As IEnumerable(Of String)) As Integer
        Dim wanted As New HashSet(Of String)(names.Select(Function(name) NormalizeKey(name)), StringComparer.Ordinal)
        For index As Integer = 0 To header.Length - 1
            If wanted.Contains(NormalizeKey(header(index))) Then Return index
        Next
        Return -1
    End Function

    Private Shared Function ReadExplicitStatus(row As String(), statusIndex As Integer) As String
        If statusIndex >= 0 Then Return Cell(row, statusIndex)

        For index As Integer = 0 To row.Length - 1
            If index = CategoryIndex OrElse index = TitleIndex OrElse index = DescriptionIndex Then Continue For
            Dim value As String = row(index).Trim()
            If IsRecognizedStatus(value) Then Return value
        Next
        Return String.Empty
    End Function

    Private Shared Function IsRecognizedStatus(value As String) As Boolean
        Select Case NormalizeKey(value)
            Case "avendre", "forsale", "a louer", "alouer", "forrent", "disponible", "vendu", "vendue", "sold", "souscompromis", "underoffer", "sousoffre", "loue", "louee", "rented", "horsmarche", "offmarket", "retire", "withdrawn"
                Return True
            Case Else
                Return False
        End Select
    End Function

    Private Shared Function ToDatabaseStatus(sourceStatus As String) As String
        Select Case NormalizeKey(sourceStatus)
            Case "vendu", "vendue", "sold"
                Return "sold"
            Case "souscompromis", "underoffer", "sousoffre"
                Return "under_offer"
            Case "loue", "louee", "rented"
                Return "rented"
            Case "horsmarche", "offmarket", "retire", "withdrawn"
                Return "off_market"
            Case Else
                Return "active"
        End Select
    End Function

    Private Shared Function ParseTransactionType(category As String, id As Integer) As String
        Dim value As String = NormalizeKey(category)
        If value.StartsWith("vente", StringComparison.Ordinal) OrElse value = "sale" OrElse value = "forsale" OrElse value = "avendre" Then Return "vente"
        If value.StartsWith("location", StringComparison.Ordinal) OrElse value = "rent" OrElse value = "forrent" OrElse value = "alouer" Then Return "location"
        Throw New InvalidDataException($"Property {id} has an unsupported transaction category '{category}'.")
    End Function

    Private Shared Function ParsePropertyType(rawType As String) As String
        Dim value As String = NormalizeKey(rawType)
        If value.Contains("appartement", StringComparison.Ordinal) OrElse value.Contains("apartment", StringComparison.Ordinal) Then Return "appartement"
        If value.Contains("maison", StringComparison.Ordinal) OrElse value.Contains("villa", StringComparison.Ordinal) OrElse value.Contains("house", StringComparison.Ordinal) Then Return "maison_villa"
        Return "autre"
    End Function

    Private Shared Function DefaultTitle(rawType As String, cityName As String) As String
        Dim typeLabel As String = If(ParsePropertyType(rawType) = "maison_villa", "Maison", If(ParsePropertyType(rawType) = "appartement", "Appartement", "Bien immobilier"))
        Return $"{typeLabel} à {cityName}"
    End Function

    Private Shared Function InferCity(nearby As String, title As String, description As String, sourceCities As Dictionary(Of String, String)) As String
        Dim candidates As String = String.Join(" ", {nearby, title, description})
        Dim normalizedText As String = NormalizeKey(candidates)
        Dim selectedCity As String = String.Empty
        Dim selectedIndex As Integer = Integer.MaxValue
        For Each city As String In sourceCities.Values.OrderByDescending(Function(value) NormalizeKey(value).Length)
            Dim cityIndex As Integer = normalizedText.IndexOf(NormalizeKey(city), StringComparison.Ordinal)
            If cityIndex >= 0 AndAlso cityIndex < selectedIndex Then
                selectedCity = city
                selectedIndex = cityIndex
            End If
        Next
        Return selectedCity
    End Function

    Private Shared Sub AddCanonicalCity(cities As Dictionary(Of String, String), cityName As String)
        Dim key As String = NormalizeKey(cityName)
        If key.Length > 0 AndAlso Not cities.ContainsKey(key) Then cities.Add(key, cityName.Trim())
    End Sub

    Private Shared Function CanonicalCity(cities As Dictionary(Of String, String), cityName As String) As String
        Dim key As String = NormalizeKey(cityName)
        Dim canonical As String = Nothing
        Return If(cities.TryGetValue(key, canonical), canonical, cityName.Trim())
    End Function

    Private Shared Function BuildImages(row As String(), propertyId As Integer, title As String) As List(Of ImportedImage)
        Dim images As New List(Of ImportedImage)()
        For sourceIndex As Integer = FirstImageIndex To LastImageIndex
            Dim url As String = Cell(row, sourceIndex)
            If url.Length = 0 Then Continue For

            Dim uri As Uri = Nothing
            If Not Uri.TryCreate(url, UriKind.Absolute, uri) OrElse uri.Scheme <> Uri.UriSchemeHttps Then Continue For

            Dim sortOrder As Integer = images.Count
            Dim titleIndex As Integer = FirstImageTitleIndex + (sourceIndex - FirstImageIndex)
            Dim altText As String = Cell(row, titleIndex)
            If altText.Length = 0 Then altText = $"{title} - photo {sortOrder + 1}"
            images.Add(New ImportedImage With {
                .PropertyId = propertyId,
                .SourceUrl = uri.AbsoluteUri,
                .SortOrder = sortOrder,
                .AltText = altText
            })
        Next
        Return images
    End Function

    Private Shared Function BuildFeatures(row As String(), propertyId As Integer) As List(Of ImportedFeature)
        Dim features As New List(Of ImportedFeature)()
        If ParseOptionalInteger(Cell(row, BalconiesIndex), 0) > 0 Then AddFeature(features, propertyId, "balcon", "Balcon")
        If IsYes(Cell(row, ElevatorIndex)) Then AddFeature(features, propertyId, "ascenseur", "Ascenseur")
        If IsYes(Cell(row, CellarIndex)) Then AddFeature(features, propertyId, "cave", "Cave")
        If ParseOptionalInteger(Cell(row, ParkingIndex), 0) > 0 Then AddFeature(features, propertyId, "parking", "Parking")
        If ParseOptionalInteger(Cell(row, GarageIndex), 0) > 0 Then AddFeature(features, propertyId, "garage", "Garage")
        If IsYes(Cell(row, FeaturedIndex)) Then AddFeature(features, propertyId, "coup_de_coeur", "Coup de cœur")
        Return features
    End Function

    Private Shared Sub AddFeature(features As List(Of ImportedFeature), propertyId As Integer, key As String, label As String)
        features.Add(New ImportedFeature With {.PropertyId = propertyId, .FeatureKey = key, .LabelFr = label})
    End Sub

    Private Shared Function BuildSourceDetails(row As String(), negotiatorName As String) As Dictionary(Of String, Object)
        Return New Dictionary(Of String, Object)(StringComparer.Ordinal) From {
            {"Ref", Cell(row, RefIndex)},
            {"Categorie", Cell(row, CategoryIndex)},
            {"TypeBien", Cell(row, PropertyTypeIndex)},
            {"Pays", Cell(row, CountryIndex)},
            {"Proximites", Cell(row, NearbyIndex)},
            {"Honoraires", Cell(row, FeesIndex)},
            {"DispoLe", Cell(row, AvailableDateIndex)},
            {"ChargesMens", Cell(row, MonthlyChargesIndex)},
            {"Etage", Cell(row, FloorIndex)},
            {"Etages", Cell(row, FloorsIndex)},
            {"Construction", Cell(row, YearBuiltIndex)},
            {"Wc", Cell(row, ToiletsIndex)},
            {"WcSep", Cell(row, SeparateToiletIndex)},
            {"ChauffageCode", Cell(row, HeatingIndex)},
            {"Balcons", Cell(row, BalconiesIndex)},
            {"Ascenseur", Cell(row, ElevatorIndex)},
            {"Cave", Cell(row, CellarIndex)},
            {"CoupCoeur", Cell(row, FeaturedIndex)},
            {"Negociateur", negotiatorName}
        }
    End Function

    Private Shared Function CleanDescription(value As String) As String
        Dim text As String = Regex.Replace(value, "<\s*br\s*/?\s*>", Environment.NewLine, RegexOptions.IgnoreCase)
        text = Regex.Replace(text, "</\s*(p|div|li)\s*>", Environment.NewLine, RegexOptions.IgnoreCase)
        text = Regex.Replace(text, "<[^>]+>", String.Empty)
        text = WebUtility.HtmlDecode(text)
        text = text.Replace(ControlChars.CrLf, ControlChars.Lf).Replace(ControlChars.Cr, ControlChars.Lf)
        text = Regex.Replace(text, "[ \t]+", " ")
        text = Regex.Replace(text, "\n[ \t]+", "\n")
        text = Regex.Replace(text, "\n{3,}", "\n\n")
        Return text.Trim()
    End Function

    Private Shared Function ParseDecimal(value As String, label As String) As Decimal
        Dim parsed As Decimal
        If TryParseDecimal(value, parsed) Then Return parsed
        Throw New InvalidDataException($"The {label} is missing or invalid.")
    End Function

    Private Shared Function ParseOptionalDecimal(value As String, fallback As Decimal) As Decimal
        Dim parsed As Decimal
        Return If(TryParseDecimal(value, parsed), parsed, fallback)
    End Function

    Private Shared Function ParseOptionalDecimalNullable(value As String) As Decimal?
        Dim parsed As Decimal
        If TryParseDecimal(value, parsed) Then Return parsed
        Return Nothing
    End Function

    Private Shared Function TryParseDecimal(value As String, ByRef parsed As Decimal) As Boolean
        Dim normalized As String = value.Trim().Replace(ChrW(160), " ").Replace(" ", String.Empty).Replace(",", ".")
        If normalized.Length = 0 Then Return False
        Return Decimal.TryParse(normalized, NumberStyles.AllowLeadingSign Or NumberStyles.AllowDecimalPoint, CultureInfo.InvariantCulture, parsed)
    End Function

    Private Shared Function ParseOptionalInteger(value As String, fallback As Integer) As Integer
        Dim parsed As Integer
        If Integer.TryParse(value.Trim(), NumberStyles.Integer, CultureInfo.InvariantCulture, parsed) Then Return parsed
        Return fallback
    End Function

    Private Shared Function IsYes(value As String) As Boolean
        Return NormalizeKey(value) = "oui" OrElse NormalizeKey(value) = "yes" OrElse value.Trim() = "1"
    End Function

    Private Shared Function Cell(row As String(), index As Integer) As String
        If index < 0 OrElse index >= row.Length Then Return String.Empty
        Return row(index).Trim()
    End Function

    Private Shared Function NullIfEmpty(value As String) As String
        Return If(String.IsNullOrWhiteSpace(value), Nothing, value.Trim())
    End Function

    Private Shared Function NormalizeKey(value As String) As String
        Dim normalized As String = (If(value, String.Empty)).Normalize(NormalizationForm.FormD).ToLowerInvariant()
        Dim builder As New StringBuilder(normalized.Length)
        For Each character As Char In normalized
            Dim category As UnicodeCategory = CharUnicodeInfo.GetUnicodeCategory(character)
            If category = UnicodeCategory.NonSpacingMark OrElse category = UnicodeCategory.SpacingCombiningMark OrElse category = UnicodeCategory.EnclosingMark Then Continue For
            If Char.IsLetterOrDigit(character) Then builder.Append(character)
        Next
        Return builder.ToString()
    End Function

    Private Shared Function Slugify(value As String) As String
        Dim normalized As String = (If(value, String.Empty)).Normalize(NormalizationForm.FormD).ToLowerInvariant()
        Dim builder As New StringBuilder(normalized.Length)
        Dim previousWasSeparator As Boolean = True
        For Each character As Char In normalized
            Dim category As UnicodeCategory = CharUnicodeInfo.GetUnicodeCategory(character)
            If category = UnicodeCategory.NonSpacingMark OrElse category = UnicodeCategory.SpacingCombiningMark OrElse category = UnicodeCategory.EnclosingMark Then Continue For
            If Char.IsLetterOrDigit(character) Then
                builder.Append(character)
                previousWasSeparator = False
            ElseIf Not previousWasSeparator Then
                builder.Append("-"c)
                previousWasSeparator = True
            End If
        Next
        Return builder.ToString().Trim("-"c)
    End Function
End Class

Public Class FeedBuildResult
    Public Property Feed As PropertyImportFeed
    Public Property Delimiter As String
    Public Property Warnings As List(Of String)
End Class

Public Class PropertyImportFeed
    Public Property SchemaVersion As Integer
    Public Property GeneratedAt As String
    Public Property Properties As List(Of ImportedProperty)
    Public Property Cities As List(Of ImportedCity)
    Public Property Agents As List(Of ImportedAgent)
End Class

Public Class ImportedCity
    Public Property Id As String
    Public Property Name As String
    Public Property Slug As String
    Public Property PostalCodes As List(Of String)
    Public Property IsActive As Boolean
End Class

Public Class ImportedAgent
    Public Property Id As String
    Public Property FullName As String
    Public Property Role As String
End Class

Public Class ImportedProperty
    Public Property Id As Integer
    Public Property Title As String
    Public Property Slug As String
    Public Property TransactionType As String
    Public Property PropertyType As String
    Public Property Status As String
    Public Property SourceStatus As String
    Public Property PriceAmount As Integer
    Public Property PriceCurrency As String
    Public Property SurfaceM2 As Decimal
    Public Property TerrainM2 As Decimal?
    Public Property Rooms As Integer
    Public Property Bedrooms As Integer
    Public Property Bathrooms As Integer
    Public Property ParkingCount As Integer
    Public Property GarageCount As Integer
    Public Property DpeLabel As String
    Public Property DpeValue As Decimal?
    Public Property GesLabel As String
    Public Property GesValue As Decimal?
    Public Property Description As String
    Public Property CityId As String
    Public Property PostalCode As String
    <JsonPropertyName("lat")>
    Public Property Latitude As Decimal?
    <JsonPropertyName("lng")>
    Public Property Longitude As Decimal?
    Public Property AgentId As String
    Public Property PublishedAt As String
    Public Property UpdatedAt As String
    Public Property IsFeatured As Boolean
    Public Property Images As List(Of ImportedImage)
    Public Property Features As List(Of ImportedFeature)
    Public Property SourceDetails As Dictionary(Of String, Object)
End Class

Public Class ImportedImage
    Public Property PropertyId As Integer
    Public Property SourceUrl As String
    Public Property SortOrder As Integer
    Public Property AltText As String
End Class

Public Class ImportedFeature
    Public Property PropertyId As Integer
    Public Property FeatureKey As String
    Public Property LabelFr As String
End Class
