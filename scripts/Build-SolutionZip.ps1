# Builds an unmanaged Dataverse solution ZIP that CRM can import.
# Required root entries: solution.xml, customizations.xml, [Content_Types].xml
# Output: dist/LookupFilteredSubgridSolution_1_0_1_0.zip

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "LookupFilteredSubgrid\package.json"))) {
  $root = "C:\Users\Ayushman Jha\OneDrive\Desktop\ZERODHA\PCF"
}

$pcfOut = Join-Path $root "LookupFilteredSubgrid\out\controls\LookupFilteredSubgrid"
$distDir = Join-Path $root "dist"
$importDir = Join-Path $root "dist\_import"
$controlName = "cpf_CustomPCF.PCF.LookupFilteredSubgrid"
$zipPath = Join-Path $distDir "LookupFilteredSubgridSolution_1_3_1_0.zip"

if (-not (Test-Path (Join-Path $pcfOut "bundle.js"))) {
  throw "PCF build output not found at $pcfOut. Run 'npm run build' in LookupFilteredSubgrid first."
}

if (Test-Path $importDir) { Remove-Item $importDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $importDir "Controls\$controlName\css") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $importDir "Controls\$controlName\strings") | Out-Null
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

function Write-Utf8NoBom([string]$Path, [string]$Content) {
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

# Control assets (import layout uses Controls/ at zip root)
Copy-Item (Join-Path $pcfOut "ControlManifest.xml") (Join-Path $importDir "Controls\$controlName\ControlManifest.xml") -Force
Copy-Item (Join-Path $pcfOut "bundle.js") (Join-Path $importDir "Controls\$controlName\bundle.js") -Force
Copy-Item (Join-Path $pcfOut "css\*") (Join-Path $importDir "Controls\$controlName\css\") -Force
Copy-Item (Join-Path $pcfOut "strings\*") (Join-Path $importDir "Controls\$controlName\strings\") -Force

# solution.xml at ZIP ROOT (required by Dataverse import)
@"
<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml version="9.2.25034.180" SolutionPackageVersion="9.2" languagecode="1033" generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SolutionManifest>
    <UniqueName>LookupFilteredSubgridSolution</UniqueName>
    <LocalizedNames>
      <LocalizedName description="Lookup Filtered Subgrid 1.3.1" languagecode="1033" />
    </LocalizedNames>
    <Descriptions>
      <Description description="PCF subgrid filtered by a form lookup value, with CRUD support for Power Pages. 1.3.1" languagecode="1033" />
    </Descriptions>
    <Version>1.3.1.0</Version>
    <Managed>0</Managed>
    <Publisher>
      <UniqueName>CustomPCF</UniqueName>
      <LocalizedNames>
        <LocalizedName description="CustomPCF" languagecode="1033" />
      </LocalizedNames>
      <Descriptions>
        <Description description="CustomPCF" languagecode="1033" />
      </Descriptions>
      <EMailAddress xsi:nil="true" />
      <SupportingWebsiteUrl xsi:nil="true" />
      <CustomizationPrefix>cpf</CustomizationPrefix>
      <CustomizationOptionValuePrefix>61736</CustomizationOptionValuePrefix>
      <Addresses>
        <Address>
          <AddressNumber>1</AddressNumber>
          <AddressTypeCode>1</AddressTypeCode>
          <City xsi:nil="true" />
          <County xsi:nil="true" />
          <Country xsi:nil="true" />
          <Fax xsi:nil="true" />
          <FreightTermsCode xsi:nil="true" />
          <ImportSequenceNumber xsi:nil="true" />
          <Latitude xsi:nil="true" />
          <Line1 xsi:nil="true" />
          <Line2 xsi:nil="true" />
          <Line3 xsi:nil="true" />
          <Longitude xsi:nil="true" />
          <Name xsi:nil="true" />
          <PostalCode xsi:nil="true" />
          <PostOfficeBox xsi:nil="true" />
          <PrimaryContactName xsi:nil="true" />
          <ShippingMethodCode>1</ShippingMethodCode>
          <StateOrProvince xsi:nil="true" />
          <Telephone1 xsi:nil="true" />
          <Telephone2 xsi:nil="true" />
          <Telephone3 xsi:nil="true" />
          <TimeZoneRuleVersionNumber xsi:nil="true" />
          <UPSZone xsi:nil="true" />
          <UTCOffset xsi:nil="true" />
          <UTCConversionTimeZoneCode xsi:nil="true" />
        </Address>
      </Addresses>
    </Publisher>
    <RootComponents>
      <RootComponent type="66" schemaName="$controlName" behavior="0" />
    </RootComponents>
    <MissingDependencies />
  </SolutionManifest>
</ImportExportXml>
"@ | ForEach-Object { Write-Utf8NoBom -Path (Join-Path $importDir "solution.xml") -Content $_ }

# customizations.xml at ZIP ROOT (required by Dataverse import)
@"
<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Entities />
  <Roles />
  <Workflows />
  <FieldSecurityProfiles />
  <Templates />
  <EntityMaps />
  <EntityRelationships />
  <OrganizationSettings />
  <optionsets />
  <CustomControls>
    <CustomControl>
      <Name>$controlName</Name>
      <FileName>/Controls/$controlName/ControlManifest.xml</FileName>
    </CustomControl>
  </CustomControls>
  <SolutionPluginAssemblies />
  <EntityDataProviders />
  <Languages>
    <Language>1033</Language>
  </Languages>
</ImportExportXml>
"@ | ForEach-Object { Write-Utf8NoBom -Path (Join-Path $importDir "customizations.xml") -Content $_ }

# [Content_Types].xml at ZIP ROOT
@"
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/octet-stream" />
  <Default Extension="js" ContentType="application/octet-stream" />
  <Default Extension="css" ContentType="application/octet-stream" />
  <Default Extension="resx" ContentType="application/octet-stream" />
  <Override PartName="/solution.xml" ContentType="application/octet-stream" />
  <Override PartName="/customizations.xml" ContentType="application/octet-stream" />
  <Override PartName="/Controls/$controlName/ControlManifest.xml" ContentType="application/octet-stream" />
</Types>
"@ | ForEach-Object { Write-Utf8NoBom -Path (Join-Path $importDir "[Content_Types].xml") -Content $_ }

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Zip entries must be at the root of the archive (not nested under a folder).
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  $files = Get-ChildItem -Path $importDir -Recurse -File
  foreach ($file in $files) {
    $relative = $file.FullName.Substring($importDir.Length).TrimStart("\", "/")
    $entryName = $relative.Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $zip,
      $file.FullName,
      $entryName,
      [System.IO.Compression.CompressionLevel]::Optimal
    ) | Out-Null
  }
}
finally {
  $zip.Dispose()
}

Remove-Item $importDir -Recurse -Force

# Verify required entries exist at zip root
$verify = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $names = $verify.Entries | ForEach-Object { $_.FullName.Replace("\", "/") }
  $required = @("solution.xml", "customizations.xml", "[Content_Types].xml")
  foreach ($r in $required) {
    if ($names -notcontains $r) {
      throw "Packaged zip is missing required root entry: $r. Found: $($names -join ', ')"
    }
  }
  Write-Host "Zip root entries OK: $($required -join ', ')"
  $names | ForEach-Object { Write-Host "  $_" }
}
finally {
  $verify.Dispose()
}

Write-Host "Created: $zipPath"
Get-Item $zipPath | Format-List FullName, Length, LastWriteTime
