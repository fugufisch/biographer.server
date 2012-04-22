BooleNetDebug = function(msg) {
			document.getElementById('BooleNetDebug').innerHTML = msg;
			}

canvas = document.getElementById('canvas');
img = document.getElementById('Tron');

function rotateAroundCenter() {
	alpha = 15;
	width = 70;
	height = 70;
	var context = canvas.getContext('2d');
	context.translate(width/2, height/2);
	context.rotate(alpha*Math.PI/180);
	context.translate(-width/2, -height/2);
	context.drawImage(img, 0, 0);
	timeout = window.setTimeout('rotateAroundCenter();', 50);
	window.onunload = function() { window.clearTimeout(timeout); }
	}

function LoadWhi2p() {
	delete network;
	BooleNetDebug('Downloading ...');
	data = GET(env['biographer']+'/Get/Whi2p_boolenet');
	BooleNetDebug('Importing ...');
	network = new BooleNet.Import(data);
	BooleNetDebug('Graphviz ...');
	doGraphviz();
	importBooleNetWindow.close();
	window.setTimeout('popupControls.close();', 300);
	}
