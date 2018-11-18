module.exports = function(app) {
	var Web3 = require('web3')
		bcrypt = require('bcrypt'),
		Cryptr = require('cryptr'),
		BigNumber = require('bignumber.js'),
		net = require('net'),
		Tx = require('ethereumjs-tx'),
		stripHexPrefix = require('strip-hex-prefix'),
		ethereum_address = require('ethereum-address'),
		svWriter = require('csv-write-stream');

	var cryptr = new Cryptr('SimmitriBlockchain');
	var client = new net.Socket();

	/* Web3 Initialization */
	//var web3 = new Web3(new Web3.providers.IpcProvider(app.web3.provider, client));
	var web3 = new Web3(new Web3.providers.HttpProvider(app.web3.provider)); // Using Infura

	/* Contract initialization */
	var contractObj = new web3.eth.Contract(app.contract.abi, app.contract.address);
	contractObj.options.from = app.contract.owner_address;

	var nonce1 = 0;
	var nonce2 = 0;

	app.get('/test', function(req, res){
		//nonce1++;
		return res.send({status: true, msg: 'this is a test!', data: nonce1});
	});

	/* Airdrop Usage */
	app.post('/airdrop', async function(req, res){
		if(!hasRights(req))
			return res.send({status: false, msg: 'you are not authorized!'});

		if(!req.body.address || !req.body.tokenAmount || isNaN(req.body.tokenAmount))
			return res.send({status: false, msg: 'invalid parameters!'});

		var address = req.body.address;
		var tokenAmount = new BigNumber(req.body.tokenAmount * Math.pow(10, app.contract.decimals));

		var privateKeyString = stripHexPrefix(app.dist.privateKey);
		var privateKey = new Buffer(privateKeyString, 'hex');

		var gasPrice = new BigNumber(await web3.eth.getGasPrice());
		var gasPriceGlobal = new BigNumber(20000000000);

		if(gasPrice.isLessThan(gasPriceGlobal))
			gasPrice = gasPriceGlobal;

		var nonce = await web3.eth.getTransactionCount(app.dist.address).catch((error) => {
			return res.send({status: false, msg: 'error occurred in getting transaction count!'});
		});

		if(nonce1 != 0 && nonce1 >= nonce)
			nonce = nonce1 + 1;

		nonce1 = nonce;

		var txData = contractObj.methods.transfer(address, tokenAmount).encodeABI();
		var txParams = {
			nonce: web3.utils.toHex(nonce),
			gasPrice: web3.utils.toHex(gasPrice),
			gasLimit: web3.utils.toHex(400000),
			from: app.dist.address,
			to: contractObj._address,
			value: '0x00',
			chainId: app.chainId,
			data: txData
		};

		var tx = new Tx(txParams);
		tx.sign(privateKey);

		var serializedTx = tx.serialize();

		web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
		.on('transactionHash', function(hash){
			console.log('hash - ' + hash);
			return res.send({status: true, hash: hash});
		}).on('error', function(err){
			console.log(err.message);
			return res.send({status: false, msg: err.message});
		}).on('receipt', function(res){
			console.log(res);
		});
	});

	/* Airdrop Usage */
	app.post('/airdrop_sub', async function(req, res){
		if(!hasRights(req))
			return res.send({status: false, msg: 'you are not authorized!'});

		if(!req.body.address || !req.body.tokenAmount || isNaN(req.body.tokenAmount))
			return res.send({status: false, msg: 'invalid parameters!'});

		var address = req.body.address;
		var tokenAmount = new BigNumber(req.body.tokenAmount * Math.pow(10, app.contract.decimals));

		var privateKeyString = stripHexPrefix(app.payment.privateKey);
		var privateKey = new Buffer(privateKeyString, 'hex');

		var gasPrice = new BigNumber(await web3.eth.getGasPrice());
		var gasPriceGlobal = new BigNumber(20000000000);

		if(gasPrice.isLessThan(gasPriceGlobal))
			gasPrice = gasPriceGlobal;

		var nonce = await web3.eth.getTransactionCount(app.payment.address).catch((error) => {
			return res.send({status: false, msg: 'error occurred in getting transaction count!'});
		});

		if(nonce2 != 0 && nonce2 >= nonce)
			nonce = nonce2 + 1;

		nonce2 = nonce;

		var txData = contractObj.methods.transfer(address, tokenAmount).encodeABI();
		var txParams = {
			nonce: web3.utils.toHex(nonce),
			gasPrice: web3.utils.toHex(gasPrice),
			gasLimit: web3.utils.toHex(400000),
			from: app.payment.address,
			to: contractObj._address,
			value: '0x00',
			chainId: app.chainId,
			data: txData
		};

		var tx = new Tx(txParams);
		tx.sign(privateKey);

		var serializedTx = tx.serialize();

		web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
		.on('transactionHash', function(hash){
			console.log('hash - ' + hash);
			return res.send({status: true, hash: hash});
		}).on('error', function(err){
			console.log(err.message);
			return res.send({status: false, msg: err.message});
		}).on('receipt', function(res){
			console.log(res);
		});
	});

	function hasRights(req){
		var key = '';
		if(req.headers['x-api-key'])
			key = req.headers['x-api-key'];

		if(key != app.key)
			return false;
		return true;
	}
}