# Test webhook with LATEST order from PocketBase
$pocketbaseUrl = "https://backend.karigaistore.in"
$testUrl = "http://localhost:3001/api/test-payment-update"

Write-Host "`nFetching latest order from PocketBase..." -ForegroundColor Cyan

try {
    # Get latest order (no auth needed if API rules allow)
    $ordersResponse = Invoke-RestMethod -Uri "$pocketbaseUrl/api/collections/orders/records?page=1&perPage=1&sort=-created" -Method Get
    
    if ($ordersResponse.items.Count -gt 0) {
        $latestOrder = $ordersResponse.items[0]
        $orderId = $latestOrder.id
        
        Write-Host "✅ Found order: $orderId" -ForegroundColor Green
        Write-Host "   Current status: $($latestOrder.payment_status)" -ForegroundColor Yellow
        Write-Host "   Total: $($latestOrder.total)" -ForegroundColor Yellow
        
        Write-Host "`nTesting webhook with this order..." -ForegroundColor Cyan
        
        $body = @{
            orderId   = $orderId
            paymentId = "pay_test_webhook_$(Get-Date -Format 'yyyyMMddHHmmss')"
            amount    = [int]$latestOrder.total
            status    = "captured"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri $testUrl -Method Post -Body $body -ContentType "application/json"
        
        Write-Host "`n✅✅ WEBHOOK TEST SUCCESSFUL! ✅✅" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Cyan
        Write-Host ($response | ConvertTo-Json) -ForegroundColor White
        
        Write-Host "`nVerifying in PocketBase..." -ForegroundColor Cyan
        $updated = Invoke-RestMethod -Uri "$pocketbaseUrl/api/collections/orders/records/$orderId" -Method Get
        Write-Host "✅ Order payment_status: $($updated.payment_status)" -ForegroundColor Green
        Write-Host "✅ Order status: $($updated.status)" -ForegroundColor Green
        
    }
    else {
        Write-Host "❌ No orders found in PocketBase!" -ForegroundColor Red
        Write-Host "   Create an order first, then run this test." -ForegroundColor Yellow
    }
    
}
catch {
    Write-Host "`n❌ ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Yellow
    
    if ($_.Exception.Message -like "*404*") {
        Write-Host "`nThis means PocketBase API rules might be blocking access." -ForegroundColor Yellow
        Write-Host "Go to PocketBase Admin → orders collection → API Rules" -ForegroundColor Cyan
        Write-Host "Set List rule to: @request.auth.id != '''' OR @public = true" -ForegroundColor White
    }
}

Write-Host "`n"
