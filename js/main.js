//high res timer thing. from http://stackoverflow.com/questions/6233927/microsecond-timing-in-javascript
if (window.performance.now) {
    myconsolelog("Using high performance timer");
    getTimestamp = function() { return window.performance.now(); };
} else {
    if (window.performance.webkitNow) {
        myconsolelog("Using webkit high performance timer");
        getTimestamp = function() { return window.performance.webkitNow(); };
    } else {
        myconsolelog("Using low performance timer");
        getTimestamp = function() { return new Date().getTime(); };
    }
}

//CONFIG
var test1CanvasActive=false;
var testColCanvasActive=false;
var myConsoleLoggingActive=false;
var gunCountdown;

//hard code these for now. 
//TODO set these at level load time. (eg call some function loadLevel...)
//small level
/*
var LEVEL_WIDTH = 512;
var LEVEL_HEIGHT = 1024; 
var LEVEL_DESTR_SRC = "img/egypt_level1-t.png"; //-t is black changed to transparent
var LEVEL_INDEST_SRC = "img/egypt_level1i-t.png";
*/
//big level (same as GF2 level 2* upscaled (21x63 x 32x32))
var LEVEL_WIDTH = 672;
var LEVEL_HEIGHT = 2016; 
var LEVEL_DESTR_SRC = "img/egypt_level-big-t.png";
var LEVEL_INDEST_SRC = "img/egypt_level-bigi-t.png";

var LEVEL_NUMPIX = LEVEL_WIDTH*LEVEL_HEIGHT;


var levelImage, levelImageLoaded;	//TODO move to some object
var levelIndestImage, levelIndestImageLoaded;

var ctx;
var canvas;
var canvas2;
var canvas2i; 
	//indestructible canvas for use in same way as destructible canvas (copy to screen) - temp solution. better to either use image, or paste indest over destr canvas when wanted.

var ctx2, ctx2i;   //2nd canvas for intermediate rendering of level image with transparency ( and ...i for indestructible copy)
var lw;
var lh;

var testcanvas;	//to draw collision detection data to check it looks OK

var preMadeCircleImage = [];


//using typed array should ensure is dense array.

//for now just use 1 value per pixel to see how stacks up against standard array
var collisionData8Buffer = new ArrayBuffer(LEVEL_NUMPIX);
var collisionData8View = new Uint8Array(collisionData8Buffer);
var preMadeCircleColData8View= [];

//single bit per pixel array. 
var collisionDataBufferDoubleBits = new ArrayBuffer(LEVEL_NUMPIX*2/8);
var collisionDataDoubleBits32View = new Uint32Array(collisionDataBufferDoubleBits); 
			//3* scaled up GF2 levels are odd multiple of 16. each 32 bit value covers 16 pixels (2 bits per pixel)
//initialise it (unsure if required)
for (var ii=0;ii<LEVEL_NUMPIX/16;ii++){
	collisionDataDoubleBits32View[ii]= 0;
}
			
var preMadeCircleColDataDoubleBits32View= [];	//2 bits per level pixel - 1 for indestructible level, another for destructible level.

			
var screenCtx; //for another canvas to demonstrate scrolling
var scroll_x, scroll_y; //move to global since also used by particle drawing. (should amend this...)

//for framerate
var lastDrawTime = 0;
var framesRecently = 0;
var mechanicsLeadTime = 0;
var mechanicsTimestep = 10; //10ms so 100 fps mechanics 

//really should learn about ho to use objects to organise things! eg using something to make vectors
var cursor_x=50;
var cursor_y=48;
var cursor_vx=0;
var cursor_vy=0;
var interp_cursor_x, interp_cursor_x, interpFactor;

var gunLength = 10,
	gunAngle = 45,
	gunAngleRadians,
	cosGunAngle,
	sinGunAngle;

//background image for parallax. 
var bgImg;
var bgImgLoaded = false;
var expImgLoaded = false;

var keyThing;	//used in conjnuction with js_utils/keys.js


var bombs = {};	//this should probably be some kind of object so can have method to draw all etc
var bombidx =0;	//every time make a new bomb increase this. realistically probebl no problem with fact number is limited, but bothersome...

var currentWeapon = weapons[0];	//select default weapon

var explosionDropdown, explosionDropdownRadius;

//taken from fullscreen test project
window.onresize = aspectFitCanvas;		//this works if not explicitly using HTML5. ?!!!!!!!

   
function aspectFitCanvas(evt) {

    var ww = window.innerWidth -2;
    var wh = window.innerHeight -2;
    
	//console.log("aspect fitting canvas... ww = " + ww + ", wh = " + wh);

	//fails if put <!DOCTYPE html> in the html doc and assign numbers to style.height etc!! wants strings ending in "px" apparently 
	if ( ww * canvas.height > wh * canvas.width ) {
        canvas.style.height = "" + wh + "px";
        canvas.style.width = "" + ( wh * canvas.width / canvas.height) + "px";
    } else {
        canvas.style.width = "" + ww + "px";
        canvas.style.height = "" + ( ww * canvas.height / canvas.width ) + "px";
    }
	
	//repeat for 2nd canvas (temp)
    //aspect fit
    if ( ww * screencanvas.height > wh * screencanvas.width ) {
        screencanvas.style.height = "" + wh + "px";
        screencanvas.style.width = "" + ( wh * screencanvas.width / screencanvas.height ) + "px";
    } else {
        screencanvas.style.width = "" + ww + "px";
        screencanvas.style.height = "" + ( ww * screencanvas.height / screencanvas.width ) + "px";
    }
}


window.onload = function() {
	var explosionDropdown = document.getElementById('explosion_dropdown');
	explosionDropdown.addEventListener('change', function(evt){
		console.log("explosion size set to : " + explosionDropdown.value);
		explosionDropdownRadius = parseInt(explosionDropdown.value);
	});
	console.log("going to set initial size : " + explosionDropdown.value);
	explosionDropdownRadius=parseInt(explosionDropdown.value);

	canvas = document.getElementById('canvas');
	canvas.style.backgroundColor='rgba(0, 0, 0, 255)';

	//load level image
	levelImage = new Image();
	levelImage.onload = function(){
		console.log('level image loaded');
		levelImageLoaded = true;
		afterLoadFunc();
	}
	levelImage.src = LEVEL_DESTR_SRC; 

	levelIndestImage = new Image();
	levelIndestImage.onload = function(){
		console.log("indestructible part of level loaded");
		levelIndestImageLoaded = true;
		afterLoadFunc();
	}
	levelIndestImage.src = LEVEL_INDEST_SRC;
	
	//background image
	bgImg = new Image();
	bgImg.onload = function(){
		console.log('background image loaded');
		bgImgLoaded = true;
		afterLoadFunc();
	}
	//bgImg.src = "img/desertdull.png";
	bgImg.src = "img/test_card.png";
	
	//explosion image
	explImg = new Image();
	explImg.onload = function(){
		expImgLoaded = true;
		console.log('explosion image loaded');
		afterLoadFunc();
	};
	explImg.src='img/expl10.png';
	
	
	//test? have a 2nd canvas to draw collision data into?

	
	//temp - make other canvas visible
	var screencanvas = document.getElementById('screencanvas');
	
	//override width/height? (can remove these settings from html doc)
	screencanvas.width = 672;
	screencanvas.height = 504;	//4:3 aspect"
	
	//larger than the level... - don't handle this yet!
	//screencanvas.width = 1024;
	//screencanvas.height = 1024;
	
	
	screencanvas.style.display = 'block';
	screenCtx = screencanvas.getContext('2d');
	
	
	keyThing = myKeysStatesThing();	//thing to track key states
	keyThing.setKeydownCallback(32,function(){			//32=space key
		makeACircle({offsetX:~~cursor_x, offsetY:~~cursor_y});
		myconsolelog("made a circle since space depressed");
	});
	keyThing.setKeydownCallback(17,function(){			//17 = ctrl
		//console.log("dropped a bomb!");
		//new Bomb(cursor_x, cursor_y, cursor_vx, cursor_vy);
	});
	keyThing.setKeydownCallback(97,function(){			//97 = numpad 1
		console.log("fired multidirectional shot");
		var numdirections = 16;
		var anglestep = 2*Math.PI/numdirections;
		var speed =2;
		var angle = 0;
		var vx,vy;
		for (var ii=0;ii<numdirections;ii++){
			vx = cursor_vx + speed*Math.sin(angle);
			vy = cursor_vy + speed*Math.cos(angle);
			new Bomb(cursor_x, cursor_y, vx, vy, 300 );
			angle+=anglestep;
		}
	});
	keyThing.setKeydownCallback(98,function(){			//98 = numpad 2
		console.log("fired spray shot");
		var numshots = 16;
		var speed =4;
		var vx,vy;
		//todo precalculate random numbers and cycle them
		for (var ii=0;ii<numshots;ii++){
			vx = cursor_vx + speed*gaussRand();
			vy = cursor_vy + speed*gaussRand();
			new Bomb(cursor_x, cursor_y, vx, vy, 300);
		}
	});
	
	//number keys to switch weapons (not numeric keys at the mo.) //buttons 0,1-9 have ondownkey numbers 48,49-57 
	//because http://tobyho.com/2011/11/02/callbacks-in-loops/
	function addNumberClickHandler(ii,kk){
		keyThing.setKeydownCallback(kk, function(){
			currentWeapon = weapons[ii];
			console.log("pressed a key. weapon name = " + currentWeapon.name );
		});
	}
	for (var ii=0;ii<4;ii++){
		thatweapon = weapons[ii];
		console.log("hopefully adding a callback for a weapon named " + thatweapon['name']);
		addNumberClickHandler(ii,48+ii);
	}
}


function premakeCircleImage(rad){
	var radsq = rad*rad;
	
	var collisionArray8buffer = new ArrayBuffer(radsq*4);
	preMadeCircleColData8View[rad] = new Uint8Array(collisionArray8buffer);
	var dataView8 = preMadeCircleColData8View[rad];
	
	var collisionArraySinglePixBuffer = new ArrayBuffer(radsq);	//radsq*4 pixels, *2 since 2 bits per pixel, divide by 8 (bits per byte)
	preMadeCircleColDataDoubleBits32View[rad] = new Uint32Array(collisionArraySinglePixBuffer);
	var dataViewSinglePix = preMadeCircleColDataDoubleBits32View[rad];
	
	//initialise to 0
	for (var ii=0;ii<radsq*4/16;ii++){
		dataViewSinglePix[ii]=0xaaaaaaaa;	//indestr bits default on (won't cut), destr bits default off (will cut)	
	}	
	
    var size= rad*2;
    
	
	var tmpcanvas = document.createElement("canvas"); //does this get cleaned up after use???
    tmpctx = tmpcanvas.getContext("2d");
	
	var thisImageData = tmpctx.createImageData(size,size);
    var thisImageDataData = thisImageData.data;
	
	
    //draw a circle. slow but only done once per size
	//var returnColDataArray = Array.apply(null, Array(4*radsq));	//this is faster but seems unable to make the 400x400 array
    var ii,jj,jsq,rsq,idx=0,cdata_idx=0;
    for (jj=0;jj<size;jj++){
        jsq=(jj-rad)*(jj-rad);  //this can be sped up
        for (ii=0;ii<size;ii++){
            rsq = (ii-rad)*(ii-rad) + jsq;  //this can be sped up!
            if (rsq<radsq){
                thisImageDataData[idx]=255;
                thisImageDataData[idx+1]=0;
                thisImageDataData[idx+2]=0;
                thisImageDataData[idx+3]=255;

				dataView8[cdata_idx]=0;		
            } else {
				dataView8[cdata_idx]=1;
				
				//dataViewSinglePix[cdata_idx >>> 4] |= ( 1 <<(cdata_idx & 15));		//this isn't efficient, but not really important since done during loading
				dataViewSinglePix[cdata_idx >>> 4] |= ( 1 << ((cdata_idx & 15)*2) );	//this isn't efficient, but not really important since done during loading
            }
            idx+=4;
			cdata_idx++;
        }
    }
    
    var tmpCanvas = document.createElement("canvas"); //does this get cleaned up after use???
    tmpCanvas.width = size;
    tmpCanvas.height = size;
    var tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.putImageData(thisImageData,0,0);
    
    //return tmpCanvas;
	return {'canvas':tmpCanvas};
}
//below func could be rolled into the above#
function setupCircleImageAndColData(rad){
	var returnedObj = premakeCircleImage(rad);
	console.log(returnedObj);
	preMadeCircleImage[rad] = returnedObj.canvas;
}

function getCollisionPixelDataXY(x,y){
	return getCollisionPixelData(y*LEVEL_WIDTH + x); //optimise with bit shift?
}
function getCollisionPixelData(pix){
	//collisionDataSingleBits16View[ii >> 4] &= ( (levelImageData[jj]===0 ? 0:1) <<(ii & 15));
	//console.log("pix = " + pix + ", pix >>4 = " + (pix >>4) + ", pix&15 = " + (pix&15));
	//return ((collisionDataSingleBits16View[pix >>> 4] >> (pix&15)) &1 );
	
	return ((collisionDataDoubleBits32View[pix >>> 4] >>> ((pix&15)*2 )) &3 );	//&3 since checking destr, indestr bits.
	
}

function updateDisplay(timestamp) {
    window.requestAnimationFrame(updateDisplay);

	//note that taking input in this "catchup" way is not ideal! possibly can just have some general "catchup" function that is also called when input event received
	var timeDiff = timestamp - lastDrawTime;
    lastDrawTime = timestamp;
    mechanicsLeadTime -= timeDiff; //this seeems not ideal - would prefer to get mechanics update out of updateDisplay, since guess this may be triggered close to time intend to actually draw it
                                    //(so want to do as little as pos here
    while ( mechanicsLeadTime<0 ){
        updateMechanics();
        mechanicsLeadTime += mechanicsTimestep;
    }
	
	if (test1CanvasActive){
		//for entire level image showing at top of the screen
		//copy from the offscreen level canvas to the on-screen canvas  
		ctx.fillStyle = "rgba(0,255,0,1)";
		ctx.fillRect(0,0,canvas.width, canvas.height);
		ctx.drawImage(canvas2,0,0);
	}
	
	//same thing for smaller second canvas to demo scrolling
	var sc_h = screencanvas.height;
	var sc_w = screencanvas.width;
	
		
	//var scroll = (timestamp/4) % (1024-sc_h);    //height of level - heigh of screen
	var scroll_max_x = canvas2.width - sc_w;
	var scroll_max_y = canvas2.height - sc_h;
	
    interpFactor = mechanicsLeadTime / mechanicsTimestep; 	//interpolated position 
	interp_cursor_x = cursor_x - cursor_vx*interpFactor;
	interp_cursor_y = cursor_y - cursor_vy*interpFactor;
	
	scroll_x = Math.min( Math.max( interp_cursor_x - (sc_w/2) , 0 ) , scroll_max_x );
	scroll_y = Math.min( Math.max( interp_cursor_y - (sc_h/2) , 0 ) , scroll_max_y ); // centre cursor, but don't scroll beyond end of level
	
		
	screenCtx.drawImage(bgImg, (2048-sc_w)/32 + scroll_x/16, (2048-sc_h)/32 + scroll_y/16 , sc_w/8 ,sc_h/8,		//note this does not centre view - ends up on the left, for
						0,0, sc_w,sc_h);																	//images taller than wide.
		
		
	screenCtx.drawImage(canvas2, scroll_x,scroll_y, sc_w,sc_h,
                                        0,0, sc_w, sc_h);	//copy from relevant part of destructible canvas, given scroll value to on-screen canvas 
	if (canvas2i){
		screenCtx.drawImage(canvas2i, scroll_x,scroll_y, sc_w,sc_h,
                                        0,0, sc_w, sc_h);	//same for indestructible part (this is a temporary, inefficient solution!)
	}

	
	var coldatapix= ~~cursor_x  + LEVEL_WIDTH*~~cursor_y;	//might fail if outside of bounds
	//console.log(".. " + coldatapix + ".." + collisionData[coldatapix]);

	screenCtx.fillStyle = ( collisionData8View[coldatapix]==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x-scroll_x-5,interp_cursor_y-scroll_y-5,10, 10);
	
	screenCtx.fillStyle = ( getCollisionPixelData(coldatapix)==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x-scroll_x-3,interp_cursor_y-scroll_y-3,10, 10);
	
	//ctx.fillStyle = "rgba(255,0,255,1)";	//magenta  //indicate on the whole level canvas at top of screen where scrolled to
    //ctx.fillRect(cursor_x-5,scroll-5,10, 10);
	
	//draw triangle for spaceship
	screenCtx.strokeStyle = 'blue';
	screenCtx.fillStyle = 'blue';
	screenCtx.beginPath();
	var backx = interp_cursor_x-scroll_x - gunLength*0.4*sinGunAngle;
	var backy = interp_cursor_y-scroll_y + gunLength*0.4*cosGunAngle;
	screenCtx.moveTo(interp_cursor_x-scroll_x + gunLength*sinGunAngle , interp_cursor_y-scroll_y - gunLength*cosGunAngle);
	screenCtx.lineTo(backx + gunLength*0.6*cosGunAngle , backy + gunLength*0.6*sinGunAngle);
	screenCtx.lineTo(backx - gunLength*0.6*cosGunAngle , backy - gunLength*0.6*sinGunAngle);
	screenCtx.lineTo(interp_cursor_x-scroll_x + gunLength*sinGunAngle , interp_cursor_y-scroll_y - gunLength*cosGunAngle);
	screenCtx.fill();
	screenCtx.stroke();
	
	//draw some line to show normal vector for where spaceship is (to test)
	var sshipNormal = getNormal(~~cursor_x, ~~cursor_y);
	
	//override for testing drawing
	//sshipNormal= {x:1, y:1};
	
	screenCtx.strokeStyle = 'red';
	screenCtx.beginPath();
	screenCtx.moveTo(cursor_x -scroll_x , cursor_y -scroll_y );
	screenCtx.lineTo(cursor_x + sshipNormal.x*100 -scroll_x , cursor_y + sshipNormal.y*100 -scroll_y );
	screenCtx.stroke();
	
	for (var b in bombs){
		//console.log("processing a bomb in draw loop");
		bombs[b].draw();	//this should go in the draw bit
	}
	screenCtx.globalCompositeOperation = "screen";
	for (var e in explosions){
		explosions[e].draw();
	}
	screenCtx.globalCompositeOperation = "source-over"; //set back to default
	
	//for framerate
    //var timeDiff = timestamp - lastDrawTime;
    //lastDrawTime = timestamp;
    var multiplier = Math.pow(0.999, timeDiff);
    framesRecently*= multiplier;
    framesRecently++;
    screenCtx.strokeText( framesRecently.toFixed(1) , 50,50);
	
}

function makeACircle(evt){
    
	var x = evt.offsetX;
	var y = evt.offsetY;
	myconsolelog("making a circle - x = " + x + ", y = " + y);

	//should draw a hole on canvas.
	
    //to time how long this takes
    var startTime = Date.now();
    
    var radius = explosionDropdownRadius;
	
    var diam = radius+radius;
	var radsq = radius*radius;
	var startx = Math.max(0,x-radius);
	var starty = Math.max(0,y-radius);
	var endx = Math.min(lw, x+radius );
	var endy = Math.min(lh, y+radius );

	//get cimageData from canvas and draw to it
	var iw = endx-startx;
	var ih = endy-starty;
	//var tmpImgData = ctx2.getImageData(startx, starty, iw, ih );
	//var tmpImgDataData = tmpImgData.data;
    
    //select fastest option for cutting circle, following testing for destructible_terrain_3
    //if (cuttype==600){
        //simply draw a circle using pre-created image
        
        ctx2.globalCompositeOperation="destination-out"; 
        ctx2.drawImage(preMadeCircleImage[radius], x-radius,y-radius); //using canvas or image
        
        //todo also using an image or a canvas.
        
    //}
      
    document.getElementById("time_output").innerHTML= ""+(Date.now()-startTime);

	
	var startTime = getTimestamp();
	
	//update collision data. 
	//initially this will be quite inefficient!
	//if move to using a bit per pixel, this may end up reasonably quick. 
	//may wish to move to system where value specifies distance to nearest terrain etc. avoid premature optimisation
//	coldata = preMadeCircleColData[radius];
	
	//for earlier, slower versions of circle cutting, see main-7 and earlier.
/*	
	//version using typed array
	var circArray8 = preMadeCircleColData8View[radius];
	ppstart = startx-(x-radius);
	var pix,pix2,ii;
	for (var jj = starty; jj<endy;jj++){
		pix = startx+512*jj;
		pix2 = ppstart+(radius*2)*(jj-(y-radius));
		for (ii = startx; ii<endx;ii++){
				collisionData8View[pix++]&=circArray8[pix2++];
				//collisionData[pix++]^=coldata[pix2++];	//to make it obvious what's affected by cutting
			}
	}
	myconsolelog("time to cut circle 8: " + (getTimestamp() - startTime));
	startTime = getTimestamp();
*/
	
	// code for creating cut mask
	// dataViewSinglePix = preMadeCircleColDataSingleBits16View[rad]
	// dataViewSinglePix[cdata_idx >>> 4] |= ( 1 <<(cdata_idx & 15));
	//code for creating level collsiion data 
	// collisionDataSingleBits16View[ii >>> 4] |= ( (levelImageData[jj]===0 ? 0:1) <<(ii & 15));

	var dataViewSinglePix = preMadeCircleColDataDoubleBits32View[radius];
	var levelxblockstart;
	
	levelxblockstart = startx >>> 4;
	levelxblockend = ((endx-1) >>> 4)+1;	//here , end means last one will visit, +1 (eg used in c style for loop end condition)
	
	var blockx, blockidx, yincutmask, xoffs;
	
	xoffs = (x - radius) & 15;	//mod 16
		
	var cutblocka, cutblockb, cutblockx, cutblockxstart;
	var cutblockmask;
	
	cutblockxstart = (startx+15 - (x- radius)) >>> 4; 
	
	//console.log( "levelxblockstart = " + levelxblockstart + ", levelxblockend = " + levelxblockend +
	//			"cutblockxstart = " + cutblockxstart + ", xoffs = " + xoffs);
	
	for (var jj = starty; jj<endy;jj++){	//loop over rows

		//initial version of this - unoptimised - will be able to pull out stuff from inner loop once check works ok
		//loop over level blocks. 
		
		yincutmask = jj - (y-radius); 
	
		//console.log("yincutmask = " + yincutmask);
		
		for (blockx = levelxblockstart; blockx<levelxblockend; blockx++ ){
			blockidx = (LEVEL_WIDTH/16)*jj + blockx;
			
			//cutblockx = blockx - ( (x- radius) >>> 4 ) -1;
			
			cutblockx = cutblockxstart + blockx-levelxblockstart -1;	//this can be optimised to precalc cutblockxstart - levelxblockstart - 1
			
			cutblocka = ((radius*2)/16)*yincutmask + cutblockx;			//this can be optimised to precalc ((radius*2)/16)*yincutmask
			cutblockb = cutblocka + 1;
			
			cutblockmask=0;
			
			//get roughly working ?
			if (cutblockx>=0){			
				//cutblockmask|= dataViewSinglePix[cutblocka] >>> (16-xoffs)*2;			//this can be optimised by simply assigning to cutblockx
																					//and by carrying over previous dataViewSinglePix[cutblockb] instead of looking up afresh
																					//this also means can avoid this if.
																						//*2 since switched from 16 to 32 bits
				//er , wierdly, bitshifting to right by 32 does NOT get zero!!!
				//if (xoffs !=0){
				//	cutblockmask|= dataViewSinglePix[cutblocka] >>> (16-xoffs)*2;
				//}
				cutblockmask|= dataViewSinglePix[cutblocka] >>> (16-xoffs) >>> (16-xoffs); // but 16 twice does. go figure!
				//if (jj == starty){console.log("path a");}
			} else {
				cutblockmask|= 0xffffffff >>> (16-xoffs) >>> (16-xoffs);	//affects left hand side.
				//if (jj == starty){console.log("path b");}
			}
				
			if  (cutblockx +1 <(radius*2/16)) {		
		
								//can optimise by precalc radius*2/16 . alternatively, can avoid ifs entirely...
				cutblockmask|= dataViewSinglePix[cutblockb] << xoffs*2;			//*2 since switched from 16 to 32 bits
				//if (jj == starty){console.log("path c");}
			} else {
				cutblockmask|= 0xffffffff << xoffs*2;			//*2 since switched from 16 to 32 bits, and ffff -> ffffffff
				//if (jj == starty){console.log("path d");}
			}
			
			//console.log("blocka = " + cutblocka + ", cutblockmask = " + cutblockmask);
			
			collisionDataDoubleBits32View[blockidx] &= cutblockmask;
		}

	
	}

	
	myconsolelog("time to cut circle single bits: " + (getTimestamp() - startTime));
	startTime = getTimestamp();	
}

function updateCollisionTestCanvas(){
	//simply draw black/white to test canvas from collision data.
	//to demonstrate updating OK.
	//method is slow but who cares
	var testctx = testcanvas.getContext('2d');

	testctx.fillStyle="black";
	testctx.fillRect(0,0,LEVEL_WIDTH,LEVEL_HEIGHT);
	
	testctx.fillStyle="white";
	var pix = 0;
	
	for (var yy=0; yy<LEVEL_HEIGHT;yy++){
		for (var xx=0; xx<LEVEL_WIDTH;xx++){
			//if (collisionData[pix]==true){
			//if (collisionData8View[pix]==1){
			if (getCollisionPixelData(pix)!= 0){	//something is on
				testctx.fillStyle="white";
				testctx.fillRect(xx,yy,1,1);
			}
			pix++;
		}
	}
	
	//show where destr terrain is
	testctx.fillStyle="blue";
	pix = 0;
	for (var yy=0; yy<LEVEL_HEIGHT;yy++){
		for (var xx=0; xx<LEVEL_WIDTH;xx++){
			//if (collisionData[pix]==true){
			//if (collisionData8View[pix]==1){
			if (getCollisionPixelData(pix) == 1){
				testctx.fillStyle="blue";
				testctx.fillRect(xx,yy,1,1);
			}
			pix++;
		}
	}
	//show where indestr terrain is
	testctx.fillStyle="yellow";
	pix = 0;
	for (var yy=0; yy<LEVEL_HEIGHT;yy++){
		for (var xx=0; xx<LEVEL_WIDTH;xx++){
			//if (collisionData[pix]==true){
			//if (collisionData8View[pix]==1){
			if (getCollisionPixelData(pix) == 2){
				testctx.fillStyle="yellow";
				testctx.fillRect(xx,yy,1,1);
			}
			pix++;
		}
	}
	
	testctx.fillStyle="green";
	pix = 0;
	for (var yy=0; yy<LEVEL_HEIGHT;yy++){
		for (var xx=0; xx<LEVEL_WIDTH;xx++){
			//if (collisionData[pix]==true){
			//if (collisionData8View[pix]==1){
			if (getCollisionPixelData(pix) == 3){
				testctx.fillRect(xx,yy,1,1);
			}
			pix++;
		}
	}
	
	/*
	//show where disagreement between methods
	testctx.fillStyle="red";
	pix = 0;
	for (var yy=0; yy<1024;yy++){
		for (var xx=0; xx<512;xx++){
			//if (collisionData[pix]==true){
			if (collisionData8View[pix]==0){
			if (getCollisionPixelData(pix)==1){
				testctx.fillRect(xx,yy,1,1);
			}}
			pix++;
		}
	}
	
	testctx.fillStyle="yellow";
	pix = 0;
	for (var yy=0; yy<1024;yy++){
		for (var xx=0; xx<512;xx++){
			//if (collisionData[pix]==true){
			if (collisionData8View[pix]==1){
			if (getCollisionPixelData(pix)==0){
				testctx.fillRect(xx,yy,1,1);
			}}
			pix++;
		}
	}
	*/
	
}

function updateMechanics(){
	
	//movement.
	cursor_vx += 0.2 * (keyThing.rightKey() - keyThing.leftKey());
	cursor_vy += 0.2 * (keyThing.downKey() - keyThing.upKey());
	cursor_vx*=0.99;
	cursor_vy*=0.99;
	cursor_vy+=0.025;	//same gravity as bombs	
	cursor_x+=cursor_vx;
	cursor_y+=cursor_vy;

	
	//don't go outside level
	var x_min =5;
	var y_min =5;
	if (cursor_x<x_min){cursor_x=x_min;cursor_vx=0;}
	if (cursor_y<y_min){cursor_y=y_min;cursor_vy=0;}
	var x_max = canvas2.width-5;
	var y_max = canvas2.height-5;
	if (cursor_x>x_max){cursor_x=x_max;cursor_vx=0;}
	if (cursor_y>y_max){cursor_y=y_max;cursor_vy=0;}
	
	if(keyThing.spaceKey()){makeACircle({offsetX:~~cursor_x, offsetY:~~cursor_y});}
	if(keyThing.returnKey()){makeRandomCircles();}
	
	
	//rotate spaceship/ gun angle. no acceleration for now
	gunAngle += 3.0 * ( keyThing.keystate(190) - keyThing.keystate(188) );	// <, > keys  
	gunAngleRadians = Math.PI * gunAngle / 180;
	cosGunAngle = Math.cos(gunAngleRadians);
	sinGunAngle = Math.sin(gunAngleRadians);
	//thrust
	if(keyThing.keystate(191)){	// "/" key
		cursor_vx += 0.06*sinGunAngle;
		cursor_vy -= 0.06*cosGunAngle;
	}
	
	//dropping bombs
	if (gunCountdown>0){
		gunCountdown--;
	} else {
		if (keyThing.bombKey()){
			gunCountdown = currentWeapon.fire_interval;
			//console.log("dropped a bomb!");
			new Bomb(cursor_x, cursor_y, 
			cursor_vx + currentWeapon.muz_vel*sinGunAngle + currentWeapon.spray*gaussRand() , 
			cursor_vy - currentWeapon.muz_vel*cosGunAngle + currentWeapon.spray*gaussRand() ,
			300);
		}
	}
	
	for (var b in bombs){
		//console.log("processing a bomb in game loop");
		bombs[b].iterate();
	}
	
	for (var e in explosions){
		explosions[e].iterate();
	}
	
}

 
function makeRandomCircles(){
	var circnum, circleX, circleY;
	for (circnum=0;circnum<20;circnum++){
        circleX = LEVEL_WIDTH*Math.random() | 0;
        circleY = LEVEL_HEIGHT*Math.random() | 0;		
		makeACircle({offsetX:circleX, offsetY:circleY});
	}
}

function getNormal(x,y){
	//return normal vector for level at a point
	//in future, possibly better to have a function that returns collision point and normal, for path start and end points
	
	//for now, have detection of collision separate, and when collision happens, call this function to get the normal.
	//will be used for: bouncing shots, and spray shots away from walls.
	
	//rough way to do this for 1st instance:
	//for a set of points around input co-ordinate, look at whether level exists there (via getCollisionPixelDataXY )
	//look at centre of mass of that distribution of points. compare with centre of points distribution

	//input is level grid-co-ordinates - inside that grid square, output should be same. for current collision check, don't have exact collision point anyway.
	//take a 3x3 grid around point. will mean bullets don't bounce off a 1 pixel width line. maybe can tweak to using input co-ords moved back
	//this works as expectedm, but being just 3x3, won't capture "average" gradient for lines that aren't horiz/vertical/diagonal.
	
	var masses = new Array(9);
	var startX = x-1;
	var startY = y-1;
	var massIdx=0;
	var totalMass = 0;
	var mass;
	for (jj=0;jj<3;jj++){
		for(ii=0;ii<3;ii++){
			mass = getCollisionPixelDataXY(startX+ii , startY+jj) ? 1:0;
			totalMass+=mass;
			masses[massIdx++]= mass;
		}
	}
	var massDistanceX = masses[1]+masses[4]+masses[7]
				+ 2 * ( masses[2]+masses[5]+masses[8] ); 
	var massDistanceY = masses[3]+masses[4]+masses[5]
				+ 2 * ( masses[6]+masses[7]+masses[8] ); 
	var normX = totalMass - massDistanceX;
	var normY = totalMass - massDistanceY;
	
	//normalise
	var mag = Math.sqrt(normX*normX + normY*normY);
	if (mag ==0){return {x:0,y:0};};
	console.log("xnormal : " + normX + " , ynormal : " + normY );
	return {x:normX/mag,y:normY/mag};
	
}


//from tutorial: https://www.youtube.com/watch?v=YCI8uqePkrc
function Bomb(x,y,vx,vy,t){
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.timer = t;
	this.alive = true;
	this.id = bombidx;
	bombs[bombidx++]=this;
}
Bomb.prototype.iterate = function(){
	
	//for simple improvement to collision checking every mechanics timestep, do a number of steps such that there is a maximum distance between collision
	//point checks. if make that distance 1 square, won't tunnel through things, with exception of corners (including 2 rectangles touching at corners)
	//if want to cover those, want to move to proper line algorithm. if want to be fast, should implement quadtree, or maybe SAT

	if (this.timer !=0){
		if(--this.timer ==0){
			this.destroy();
		}
	}
	
	var numSteps = Math.ceil(Math.max(Math.abs(this.vx), Math.abs(this.vy)));
	var vxstep = this.vx/numSteps;
	var vystep = this.vy/numSteps;
	for (var ii=0;ii<numSteps;ii++){
		this.x+=vxstep;
		this.y+=vystep;
		
		//world limits
		var willDestroy = false;
		if (this.x<0){this.x=0; willDestroy=true;}
		if (this.y<0){this.y=0; willDestroy=true;}
		if (this.x>=LEVEL_WIDTH){this.x=LEVEL_WIDTH; willDestroy=true;}
		if (this.y>=LEVEL_HEIGHT){this.y=LEVEL_HEIGHT; willDestroy=true;}

		if (willDestroy==true){
			this.destroy();
		} else if (getCollisionPixelDataXY(~~this.x,~~this.y)!=0){
			//collision with arena....
			//seems like a risk here that ~~ could get some number outside of arena despite checking the above....	
			//this.destroy();
			this.bounce();
			return;
		}
	}
	
	this.vy+=0.025;	//not sure if should add at start or end. not sure if current setup is consistent with interpolation.
	
}
Bomb.prototype.destroy = function(){
	console.log("detonating bomb . x = " + ~~this.x + ", y = " + ~~this.y );

	this.alive = false;
	makeACircle({offsetX:~~this.x, offsetY:~~this.y});
	delete bombs[this.id];
	//new Explosion(~~this.x, ~~this.y , 0,0, 100,0.5 );	//fixed size for now - seems about right for radius 48
	new Explosion(~~this.x, ~~this.y , 0,0, 1.6*explosionDropdownRadius,1 );
}
Bomb.prototype.bounce = function(){
	//reflection off normal http://www.3dkingdoms.com/weekly/weekly.php?a=2  Vnew = b * ( -2*(V dot N)*N + V )
	var norm = getNormal(~~this.x, ~~this.y);
	var COR =0.6; //coefficient of restitution
	var vDotN = norm.x * this.vx + norm.y * this.vy; 
	//console.log("vDotN = " + vDotN);
	if (vDotN>=0){return;}	//this happens sometimes because bounce is from INSIDE object, next iterative step away may still be inside object (less likely with COR)
	this.vx -= 2* vDotN*norm.x ; 
	this.vy -= 2* vDotN*norm.y ; 
	this.vx *=COR;
	this.vy *=COR;
}
Bomb.prototype.draw = function(){
	screenCtx.fillStyle="white";	
	if (this.alive==true){
		//should actually remove the bomb when it is destroyed! when do that, no point in the if here.
		//console.log( "drawing a bomb at x = " + this.x + ", y = " + this.y);
		screenCtx.fillRect(this.x-interpFactor*this.vx-scroll_x-2,this.y-interpFactor*this.vy-scroll_y-2,4,4);	//note this has no interpolation currently 
	}
}

function afterLoadFunc(){
	if (bgImgLoaded & levelImageLoaded & levelIndestImageLoaded & expImgLoaded){
		console.log("all images loaded");
	} else {
		console.log("not all images loaded. returning");
		return;
	}
	
	var circleSizes = [8,16,24,48,96,192,384];
	circleSizes.forEach(function(cs){
		setupCircleImageAndColData(cs);
	});
	
	lw = levelImage.width;
	lh = levelImage.height;

	//set canvas size to image size, and paste the image into it
	canvas.width = lw;
	canvas.height = lh;
	ctx = canvas.getContext('2d');

    //ctx.drawImage(levelImage,0,0);

    //make an intermediate canvas - or imagedata ??
    canvas2 = document.createElement("canvas"); //does this get cleaned up after use???
    canvas2.width = lw;
    canvas2.height = lh;
    ctx2 = canvas2.getContext("2d");
    ctx2.drawImage(levelImage,0,0);

		
	//populate collision data array from canvas.
	var levelImageData = ctx2.getImageData(0,0,LEVEL_WIDTH,LEVEL_HEIGHT).data;	//not sure this is the most direct way to go getting data from image
	console.log("imagedata length = " + levelImageData.length);
	var numPix = LEVEL_NUMPIX;
	for (var ii=0,jj=3;ii<numPix;ii++,jj+=4){

			collisionData8View[ii]	= levelImageData[jj]===0 ? 0:1;	 //populate collision array from alpha channel of level image.
																
			//efficient array. note that this code can probably be optimised ( with loop over 16 bits inside another loop)
			//collisionDataSingleBits16View[ii >>> 4] |= ( (levelImageData[jj]===0 ? 0:1) <<(ii & 15));
			
			//now use 32 bit array.
			//switches on the destr bit if appropriate (bits alternate destr, indestr)
			collisionDataDoubleBits32View[ii >>> 4] |= ( (levelImageData[jj]===0 ? 0:1) << ((ii & 15) * 2) );
			
			//override for testing
			//collisionData8View[ii] =1;
			//collisionDataSingleBits16View[ii>>>4]=0xffff;
	}

    ctx.font = "30px Arial";

	aspectFitCanvas();
	canvas.style.display = 'block';
	

	//indestructuble part of level.
	//basically do the same as for destructible part of level as temporary solution.
	//plenty of unnecessarily duplicated code. - we (should) know that the indest, edstructible level images are the same size.
	lw = levelIndestImage.width;
	lh = levelIndestImage.height;
	canvas2i = document.createElement("canvas"); //does this get cleaned up after use???
	canvas2i.width = lw;
	canvas2i.height = lh;
	ctx2i = canvas2i.getContext("2d");
	ctx2i.drawImage(levelIndestImage,0,0);
			
	//populate collision data array from canvas. - ANOTHER COPYPASTA
	var levelImageDatai = ctx2i.getImageData(0,0,LEVEL_WIDTH,LEVEL_HEIGHT).data;	//not sure this is the most direct way to go getting data from image
	console.log("imagedata length (indest) = " + levelImageDatai.length);
	var numPix = LEVEL_NUMPIX;
	for (var ii=0,jj=3;ii<numPix;ii++,jj+=4){
		collisionDataDoubleBits32View[ii >>> 4] |= ( (levelImageDatai[jj]===0 ? 0:1) << ((ii & 15)*2  +1) );
	}
		
		
	if (testColCanvasActive==true){
			//size and show test canvas for level collision data test
			testcanvas = document.getElementById("coldetcanvas");
			testcanvas.width = lw;
			testcanvas.height = lh;
			testcanvas.style.display = 'block';
			updateCollisionTestCanvas();
			
			keyThing.setKeydownCallback(67,function(){			//67=c key
							updateCollisionTestCanvas();
			});
	}
	
	//kick off draw loop
    window.requestAnimationFrame(updateDisplay);
	
}