# Creating a Private Key for Rhapsody

In order for this route's output communication point to create a JWT for API authentication, an SSL private key will need to be uploaded.


## Generating a Public/Private Key Pair

```bash
# Generate a private key
openssl genrsa -out private_key.pem 4096

# Extract the public key from the private key
openssl rsa -in private_key.pem -pubout -out public_key.pem
```

Use the contents of public_key.pem as the value of the environment variable `NBS_API_PUB_KEY`.


## Creating a .p12 File from Private Key

```bash
# Create a self-signed certificate
# You can choose the default answer for all the questions - it will not matter
openssl req -new -x509 -key private_key.pem -out certificate.crt -days 3650

# Create the P12 file that is imported into Rhapsody
# Take note of the password you choose here. You will need it later.
openssl pkcs12 -export -out DIBBsPrivateKey.p12 -inkey private_key.pem -in certificate.crt
```

## Importing the Private Key into Rhapsody

In the Rhapsody IDE
- Open the certificate and key manager 
  - View > Certificate and Key Manager
- Navigate to the "SSLPrivateKey" tab
- Import the .p12 file that you created
  - ***The key alias must be "DIBBsPrivateKey"***
  - Use the password you chose when you created this .p12 file