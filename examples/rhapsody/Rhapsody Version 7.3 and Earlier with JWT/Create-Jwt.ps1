param([string]$Key,[int]$Expiration=30)

Install-Module -Name jwtPS
Import-Module -Name jwtPS

$payload = @{       
    exp = ([System.DateTimeOffset]::Now.AddDays($Expiration)).ToUnixTimeSeconds()
}
$encryption = [jwtTypes+encryption]::SHA256
$algorithm = [jwtTypes+algorithm]::RSA
$alg = [jwtTypes+cryptographyType]::new($algorithm, $encryption)
$jwt = New-JWT -Payload $payload -Algorithm $alg -Secret $Key

Write-Output $jwt