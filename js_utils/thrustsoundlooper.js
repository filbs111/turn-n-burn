//use web audio api if available else fall back to audio elements
var thrustLooper = (function(){
	
	try {
	
		//web audio API doesn't have clean looping!
		//guess may as well just use audio elements
		//throw new Error("this is a test");	//can force fallback to audio element (another option is to test in IE)
		//since using workaround for broken looping, may as well just use audio elements ? 
		//volume setting doesn't work too well in Firefox though (possibly pause/start would work??)
	
		window.AudioContext = window.AudioContext||window.webkitAudioContext;
		var audiocontext = new AudioContext();		//what are consequences of declaring this here???
		var gainNode = audiocontext.createGain();
		gainNode.connect(audiocontext.destination);
		
		var soundAddress = 'sounds/blowtorch-fade.mp3';
		
		var soundbuffer = null;
	
		var returnObject = new Object();
		returnObject.start = function(){
				console.log("starting sound using web audio API");
				
				if (!soundbuffer){
					console.log("not loaded yet. returning");
					return;
				}
				console.log("will play sound");
	
				var source = audiocontext.createBufferSource();
				source.buffer = soundbuffer;
				source.connect(gainNode);
				//source.loop = true; //nope. this is shit!
				source.start(0);
				
				var _this= this;
				setTimeout( function(){_this.start()}, 1000); //samples are 2s long, staggered 
				
			},
		returnObject.setVolume= function(volume){ gainNode.gain.value = volume; }
	
		var request = new XMLHttpRequest();
				request.open('GET', soundAddress, true);
				request.responseType = 'arraybuffer';
				request.onload = function() {
					console.log("request loaded...");
					audiocontext.decodeAudioData(request.response, function(buffer){
						console.log("set sound buffer");
						soundbuffer = buffer;
						returnObject.start();
					}, function(err){
						console.log("oops! problem loading sound from : " + soundAddress);
					});
		};
		request.send();
	
		return returnObject;
	} catch(e) {
		alert('Web Audio API is not supported in this browser.\nFalling back to audio elements.\nA modern web browser is recommended.');
		console.log(e.name + " - " + e.message);
			
		var soundAddress = 'sounds/blowtorch-fade.mp3';
		var nextAudio =0;
		var audios = []
		for (var ii=0;ii<2;ii++){
			audios.push( new Audio(soundAddress) );
		}
		
		var returnObject = new Object();
		returnObject.start = function(){
				console.log("starting sound using audio elements. nextAudio = " + nextAudio);
				var currentAudio = audios[nextAudio];
				currentAudio.currentTime = 0;
				currentAudio.play();
				nextAudio = 1-nextAudio;
				
				var _this= this;
				setTimeout( function(){_this.start()}, 1000); //samples are 2s long, staggered 
		};
		returnObject.setVolume = function(volume){
				audios[0].volume=volume;
				audios[1].volume=volume;
		};
		
		returnObject.start();
		return returnObject;		
	}
	
})();