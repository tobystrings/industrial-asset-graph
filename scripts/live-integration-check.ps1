$headers = @{ 'content-type' = 'application/json' }
$fixture = "LIVE-TEST-$([guid]::NewGuid().ToString('N').Substring(0,8).ToUpper())"
$m1 = @{ mutationId="live-mutation-$fixture-1"; entityId=$fixture; entityType='asset'; actorId='tech-a'; clientId='device-a'; baseVersion=0; operation='UPSERT'; createdAt=(Get-Date).ToUniversalTime().ToString('o'); reviewState='APPROVED'; value=@{ id=$fixture; name='Live integration fixture' } } | ConvertTo-Json -Depth 6
$a = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8787/api/facilities/live-test/mutations -Headers $headers -Body $m1
$b = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8787/api/facilities/live-test/mutations -Headers $headers -Body $m1
$m2 = @{ mutationId="live-mutation-$fixture-2"; entityId=$fixture; entityType='asset'; actorId='tech-b'; clientId='device-b'; baseVersion=0; operation='UPSERT'; createdAt=(Get-Date).ToUniversalTime().ToString('o'); reviewState='APPROVED'; value=@{ id=$fixture; name='Conflicting fixture' } } | ConvertTo-Json -Depth 6
try { Invoke-WebRequest -Method Post -Uri http://127.0.0.1:8787/api/facilities/live-test/mutations -Headers $headers -Body $m2 -ErrorAction Stop | Out-Null; $conflict = 'unexpected-200' } catch { $conflict = $_.Exception.Response.StatusCode.value__ }
$entity = Invoke-RestMethod "http://127.0.0.1:8787/api/facilities/live-test/entities/$fixture"
[pscustomobject]@{ first=$a.status; retry=$b.status; conflict=$conflict; entity=$entity.value.name } | ConvertTo-Json -Compress
