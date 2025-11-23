# Script to cleanly add BalanceWidgetComponent to incomes-list.component.ts

param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

$lines = Get-Content $FilePath

# Step 1: Add import statement after ConfirmDialogComponent import
$importAdded = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "^import.*ConfirmDialogComponent.*from") {
        # Check if import doesn't already exist
        $hasBalanceImport = $false
        for ($j = 0; $j -lt $lines.Count; $j++) {
            if ($lines[$j] -match "^import.*BalanceWidgetComponent") {
                $hasBalanceImport = $true
                break
            }
        }
        
        if (-not $hasBalanceImport) {
            $newLines = @()
            for ($j = 0; $j -le $i; $j++) {
                $newLines += $lines[$j]
            }
            $newLines += "import { BalanceWidgetComponent } from '../shared/balance-widget.component';"
            for ($j = $i + 1; $j -lt $lines.Count; $j++) {
                $newLines += $lines[$j]
            }
            $lines = $newLines
            $importAdded = $true
            Write-Output "✓ Import statement added"
        }
        break
    }
}

# Step 2: Add to imports array (find ConfirmDialogComponent in imports array)
$inImportsArray = $false
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "imports:\s*\[") {
        $inImportsArray = $true
        continue
    }
    
    if ($inImportsArray -and $lines[$i] -match "ConfirmDialogComponent") {
        # Check if BalanceWidgetComponent is already in the array
        $hasInArray = $false
        for ($j = $i; $j -lt [Math]::Min($i + 5, $lines.Count); $j++) {
            if ($lines[$j] -match "BalanceWidgetComponent") {
                $hasInArray = $true
                break
            }
        }
        
        if (-not $hasInArray) {
            $newLines = @()
            for ($j = 0; $j -le $i; $j++) {
                $newLines += $lines[$j]
            }
            $newLines += "    BalanceWidgetComponent"
            for ($j = $i + 1; $j -lt $lines.Count; $j++) {
                $newLines += $lines[$j]
            }
            $lines = $newLines
            Write-Output "✓ Added to imports array"
        }
        break
    }
}

# Step 3: Add widget tag to template
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match '<div class="(incomes|expenses)-container">') {
        # Check if widget isn't already there
        $hasWidget = $false
        for ($j = $i; $j -lt [Math]::Min($i + 5, $lines.Count); $j++) {
            if ($lines[$j] -match "app-balance-widget") {
                $hasWidget = $true
                break
            }
        }
        
        if (-not $hasWidget) {
            $newLines = @()
            for ($j = 0; $j -le $i; $j++) {
                $newLines += $lines[$j]
            }
            $newLines += "      <!-- Balance Widget -->"
            $newLines += "      <app-balance-widget></app-balance-widget>"
            $newLines += ""
            for ($j = $i + 1; $j -lt $lines.Count; $j++) {
                $newLines += $lines[$j]
            }
            $lines = $newLines
            Write-Output "✓ Widget tag added to template"
        }
        break
    }
}

# Save the file
$lines | Set-Content $FilePath -Encoding UTF8
Write-Output "✓ File updated successfully: $FilePath"
