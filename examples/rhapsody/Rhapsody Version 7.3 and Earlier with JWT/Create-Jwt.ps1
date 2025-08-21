param([string]$Key,[int]$Days=30)

Install-Module -Name jwtPS
Import-Module -Name jwtPS

$payload = @{       
    exp = ([System.DateTimeOffset]::Now.AddDays($Days)).ToUnixTimeSeconds()
}
$encryption = [jwtTypes+encryption]::SHA256
$algorithm = [jwtTypes+algorithm]::RSA
$alg = [jwtTypes+cryptographyType]::new($algorithm, $encryption)
$jwt = New-JWT -Payload $payload -Algorithm $alg -Secret $Key

Write-Output $jwt