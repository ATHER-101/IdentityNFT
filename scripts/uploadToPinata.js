const pinataSDK = require('@pinata/sdk');
const fs = require('fs');

const pinata = new pinataSDK('5456470e28a86bec2f53', '12f1dc08af32705a2af594d2d15723452cdc57e4a765a8664eb6e563f33c3819');

// Load metadata from JSON file
const metadata = JSON.parse(fs.readFileSync('metadata-test-payment.json', 'utf-8'));

pinata.pinJSONToIPFS(metadata)
  .then((result) => {
    console.log('IPFS URI:', `ipfs://${result.IpfsHash}`);
  })
  .catch((err) => {
    console.error(err);
  });