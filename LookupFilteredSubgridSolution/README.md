# Lookup Filtered Subgrid Solution

Dataverse solution project that packages the `LookupFilteredSubgrid` PCF control.

## Build solution zip

Prerequisites: .NET Framework / MSBuild (Visual Studio Build Tools), and a successful `npm run build` in `../LookupFilteredSubgrid`.

```powershell
cd LookupFilteredSubgridSolution
dotnet build /p:Configuration=Release
# or: msbuild /t:build /restore /p:Configuration=Release
```

Import the generated solution zip from `bin\Release` (or the path shown by the build) into your Dataverse environment, then follow the Power Pages setup steps in [`../LookupFilteredSubgrid/README.md`](../LookupFilteredSubgrid/README.md).
