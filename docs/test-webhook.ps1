# Sends one test situation to your n8n webhook and prints the result.
#
# Usage (PowerShell, from the project folder):
#   .\docs\test-webhook.ps1 -Url "PASTE_YOUR_TEST_OR_PRODUCTION_URL"
#
# Optional: pick a different test case
#   .\docs\test-webhook.ps1 -Url "..." -Case 3

param(
  [Parameter(Mandatory = $true)][string]$Url,
  [ValidateRange(1, 6)][int]$Case = 1
)

$cases = @{
  1 = @{ destination = "College";        purpose = "Exam";              items = @("phone","ID card","pens","hall ticket"); special_conditions = "It is raining" }
  2 = @{ destination = "Office";         purpose = "Presentation";      items = @("laptop","charger","phone");             special_conditions = "Important client presentation" }
  3 = @{ destination = "Hospital";       purpose = "Appointment";       items = @("phone");                                special_conditions = "Need to carry previous reports" }
  4 = @{ destination = "Railway Station";purpose = "Travel";            items = @("phone","wallet");                       special_conditions = "Overnight trip" }
  5 = @{ destination = "Shopping Mall";  purpose = "Return a product";  items = @("product");                              special_conditions = "Need proof of purchase" }
  6 = @{ destination = "";               purpose = "";                  items = @();                                       special_conditions = "" }
}

$body = $cases[$Case] | ConvertTo-Json -Depth 5

Write-Host ""
Write-Host "--- SENDING (test case $Case) ---" -ForegroundColor Cyan
Write-Host $body
Write-Host ""
Write-Host "--- WAITING for the AI agent (this can take 10-40 seconds) ---" -ForegroundColor Cyan

try {
  $result = Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $body -TimeoutSec 120
  Write-Host ""
  Write-Host "--- SUCCESS ---" -ForegroundColor Green
  $result | ConvertTo-Json -Depth 8
}
catch {
  Write-Host ""
  Write-Host "--- FAILED ---" -ForegroundColor Red
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  Write-Host ""
  Write-Host "404 not registered  -> press Execute workflow in n8n first (Test URL), or Activate it (Production URL)"
  Write-Host "500 / node error    -> open the red node in n8n and read its error"
  Write-Host "Could not resolve   -> the URL is wrong or mistyped"
}
