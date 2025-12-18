# Test webhook endpoint
$uri = "http://localhost:3001/api/test-payment-update"
$body = @{
    orderId = "order_ReKsqjjQWMOPJv"
    paymentId = "pay_test_123"
    amount = 290
    status = "captured"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host $response | ConvertTo-Json
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Status Code:" $_.Exception.Response.StatusCode
    Write-Host "Message:" $_.Exception.Message
}
