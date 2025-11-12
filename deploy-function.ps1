# Deploy fixed Supabase function
$functionCode = Get-Content "supabase-function-fixed.ts" -Raw
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NDk4Mzk0MDAsImV4cCI6MTkwNzYwNTgwMH0.RUr6v34x5v9ZPaSSjIgqamSeOtPyVpfv20r7wQ4niK0"
    "Content-Type" = "application/typescript"
}

# Deploy the function (this is a simplified approach - actual deployment may require different API)
Write-Host "Function code ready for deployment. You'll need to update it in your Supabase dashboard."
Write-Host "The fixed function is in: supabase-function-fixed.ts"
Write-Host ""
Write-Host "Key fixes applied:"
Write-Host "1. ✅ Converts rupees to paise: Math.round(rupees * 100)"
Write-Host "2. ✅ Returns key_id for client/server sync"
Write-Host ""
Write-Host "Test the current function:"
$testBody = '{"amount": 999, "currency": "INR"}'
try {
    $result = Invoke-RestMethod -Uri "https://crm-supabase.7za6uc.easypanel.host/functions/v1/create-order" -Method POST -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NDk4Mzk0MDAsImV4cCI6MTkwNzYwNTgwMH0.RUr6v34x5v9ZPaSSjIgqamSeOtPyVpfv20r7wQ4niK0"; "Content-Type"="application/json"} -Body $testBody
    Write-Host "✅ Function is accessible"
    Write-Host "Order ID: $($result.id)"
    Write-Host "Amount: $($result.amount) paise (₹$($result.amount/100))"
    
    if ($result.amount -eq 999) {
        Write-Host "⚠️  ISSUE: Amount is in rupees, should be paise (99900)"
        Write-Host "👉 You need to update your function with the fixed version"
    } elseif ($result.amount -eq 99900) {
        Write-Host "✅ Amount conversion is correct!"
    }
} catch {
    Write-Host "❌ Error testing function: $($_.Exception.Message)"
}
