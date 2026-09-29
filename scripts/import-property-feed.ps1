param(
    [string]$FeedPath = (Join-Path $PSScriptRoot "..\supabase\fixtures\property-feed.json"),
    [Parameter(Mandatory = $true)][string]$Endpoint,
    [Parameter(Mandatory = $true)][string]$ImportToken,
    [switch]$DryRun
)

$resolvedFeedPath = (Resolve-Path $FeedPath -ErrorAction Stop).Path
$headers = @{ "x-property-import-token" = $ImportToken }
if ($DryRun) {
    $headers["x-property-feed-dry-run"] = "true"
}

$response = Invoke-RestMethod `
    -Method Post `
    -Uri $Endpoint `
    -Headers $headers `
    -ContentType "application/json; charset=utf-8" `
    -InFile $resolvedFeedPath `
    -MaximumRedirection 0

$response | ConvertTo-Json -Depth 8
