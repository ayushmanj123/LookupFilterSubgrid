# Builds an unmanaged Dataverse solution ZIP containing the LookupFilteredSubgrid PCF.
# Output: dist/LookupFilteredSubgridSolution_1_0_0_0.zip

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root "LookupFilteredSubgrid\package.json"))) {
  $root = "C:\Users\Ayushman Jha\OneDrive\Desktop\ZERODHA\PCF"
}

$pcfOut = Join-Path $root "LookupFilteredSubgrid\out\controls\LookupFilteredSubgrid"
$distDir = Join-Path $root "dist"
$packDir = Join-Path $root "dist\_pack"
$controlName = "zrd_Zerodha.PCF.LookupFilteredSubgrid"
$zipPath = Join-Path $distDir "LookupFilteredSubgridSolution_1_0_0_0.zip"
$packager = Join-Path $env:TEMP "pcf-nuget\Microsoft.CrmSdk.CoreTools.9.1.0.155\content\bin\coretools\SolutionPackager.exe"

if (-not (Test-Path (Join-Path $pcfOut "bundle.js"))) {
  throw "PCF build output not found at $pcfOut. Run 'npm run build' in LookupFilteredSubgrid first."
}

if (Test-Path $packDir) { Remove-Item $packDir -Recurse -Force }
New-Item -ItemType Directory -Force -Path (Join-Path $packDir "Other") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $packDir "Controls\$controlName") | Out-Null
New-Item -ItemType Directory -Force -Path $distDir | Out-Null

# Copy built control assets
Copy-Item (Join-Path $pcfOut "ControlManifest.xml") (Join-Path $packDir "Controls\$controlName\ControlManifest.xml") -Force
Copy-Item (Join-Path $pcfOut "bundle.js") (Join-Path $packDir "Controls\$controlName\bundle.js") -Force
Copy-Item (Join-Path $pcfOut "css") (Join-Path $packDir "Controls\$controlName\css") -Recurse -Force
Copy-Item (Join-Path $pcfOut "strings") (Join-Path $packDir "Controls\$controlName\strings") -Recurse -Force

# Control metadata for Solution Packager
@"
<?xml version="1.0" encoding="utf-8"?>
<CustomControl xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Name>$controlName</Name>
  <FileName>/Controls/$controlName/ControlManifest.xml</FileName>
</CustomControl>
"@ | Set-Content -Path (Join-Path $packDir "Controls\$controlName\ControlManifest.xml.data.xml") -Encoding UTF8

# Solution.xml
@"
<?xml version="1.0" encoding="utf-8"?>
<ImportExportXml version="9.2.25034.180" SolutionPackageVersion="9.2" languagecode="1033" generatedBy="CrmLive" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <SolutionManifest>
    <UniqueName>LookupFilteredSubgridSolution</UniqueName>
    <LocalizedNames>
      <LocalizedName description="Lookup Filtered Subgrid" languagecode="1033" />
    </LocalizedNames>
    <Descriptions>
      <Description description="PCF subgrid filtered by a form lookup value, with CRUD support for Power Pages." languagecode="1033" />
    </Descriptions>
    <Version>1.0.0.0</Version>
    <Managed>0</Managed>
    <Publisher>
      <UniqueName>Zerodha</UniqueName>
      <LocalizedNames>
        <LocalizedName description="Zerodha" languagecode="1033" />
      </LocalizedNames>
      <Descriptions>
        <Description description="Zerodha" languagecode="1033" />
      </Descriptions>
      <EMailAddress xsi:nil="true"></EMailAddress>
      <SupportingWebsiteUrl xsi:nil="true"></SupportingWebsiteUrl>
      <CustomizationPrefix>zrd</CustomizationPrefix>
      <CustomizationOptionValuePrefix>61735</CustomizationOptionValuePrefix>
      <Addresses>
        <Address>
          <AddressNumber>1</AddressNumber>
          <AddressTypeCode>1</AddressTypeCode>
          <City xsi:nil="true"></City>
          <County xsi:nil="true"></County>
          <Country xsi:nil="true"></Country>
          <Fax xsi:nil="true"></Fax>
          <FreightTermsCode xsi:nil="true"></FreightTermsCode>
          <ImportSequenceNumber xsi:nil="true"></ImportSequenceNumber>
          <Latitude xsi:nil="true"></Latitude>
          <Line1 xsi:nil="true"></Line1>
          <Line2 xsi:nil="true"></Line2>
          <Line3 xsi:nil="true"></Line3>
          <Longitude xsi:nil="true"></Longitude>
          <Name xsi:nil="true"></Name>
          <PostalCode xsi:nil="true"></PostalCode>
          <PostOfficeBox xsi:nil="true"></PostOfficeBox>
          <PrimaryContactName xsi:nil="true"></PrimaryContactName>
          <ShippingMethodCode>1</ShippingMethodCode>
          <StateOrProvince xsi:nil="true"></StateOrProvince>
          <Telephone1 xsi:nil="true"></Telephone1>
          <Telephone2 xsi:nil="true"></Telephone2>
          <Telephone3 xsi:nil="true"></Telephone3>
          <TimeZoneRuleVersionNumber xsi:nil="true"></TimeZoneRuleVersionNumber>
          <UPSZone xsi:nil="true"></UPSZone>
          <UTCOffset xsi:nil="true"></UTCOffset>
          <UTCConversionTimeZoneCode xsi:nil="true"></UTCConversionTimeZoneCode>
        </Address>
      </Addresses>
    </Publisher>
    <RootComponents>
      <RootComponent type="66" schemaName="$controlName" behavior="0" />
    </RootComponents>
    <MissingDependencies />
  </SolutionManifest>
</ImportExportXml>
"@ | Set-Content -Path (Join-Path $packDir "Other\Solution.xml") -Encoding UTF8

# Customizations.xml
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
  <CustomControls />
  <SolutionPluginAssemblies />
  <EntityDataProviders />
  <Languages>
    <Language>1033</Language>
  </Languages>
</ImportExportXml>
"@ | Set-Content -Path (Join-Path $packDir "Other\Customizations.xml") -Encoding UTF8

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

if (Test-Path $packager) {
  & $packager /action:Pack /zipfile:$zipPath /folder:$packDir /packagetype:Unmanaged /allowDelete:Yes
  if ($LASTEXITCODE -ne 0) { throw "SolutionPackager failed with exit code $LASTEXITCODE" }
} else {
  # Fallback: zip folder contents directly (CRM import format)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory($packDir, $zipPath)
}

# Cleanup staging
Remove-Item $packDir -Recurse -Force

Write-Host "Created: $zipPath"
Get-Item $zipPath | Format-List FullName, Length, LastWriteTime
