param([string]$Key)

Install-Module -Name jwtPS
Import-Module -Name jwtPS

Write-Output $Name

$payload = @{       
    exp = ([System.DateTimeOffset]::Now.AddHours(3)).ToUnixTimeSeconds()
}
$encryption = [jwtTypes+encryption]::SHA256
$algorithm = [jwtTypes+algorithm]::RSA
$alg = [jwtTypes+cryptographyType]::new($algorithm, $encryption)
$jwt = New-JWT -Payload $payload -Algorithm $alg -Secret $Key

Write-Output $jwt