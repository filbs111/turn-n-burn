//load in a level image
//generate collision data for the level image
//when blow a hole in landscape - draw to canvas AND edit collision data

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


var testColCanvasActive=false;
var myConsoleLoggingActive=false;

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


//do collision data in a more efficient way
//using typed array should ensure is dense array.
//also, can use smaller number of bits per pixel 
//in future, can use offset views and store more than 1 pixel of data
//per value in the array (eg 16 pixels in one 16 bit number)

//for now just use 1 value per pixel to see how stacks up against standard
//array

var collisionData8Buffer = new ArrayBuffer(512*1024);
var collisionData8View = new Uint8Array(collisionData8Buffer);
var preMadeCircleColData8View= [];

//single bit per pixel array. 
var collisionDataBufferDoubleBits = new ArrayBuffer(512*1024*2/8);
var collisionDataDoubleBits32View = new Uint32Array(collisionDataBufferDoubleBits); 
			//3* scaled up GF2 levels are odd multiple of 16. each 32 bit value covers 16 pixels (2 bits per pixel)
//initialise it (unsure if required)
for (var ii=0;ii<512*1024/16;ii++){
	collisionDataDoubleBits32View[ii]= 0;
}
			
var preMadeCircleColDataDoubleBits32View= [];	//2 bits per level pixel - 1 for indestructible level, another for destructible level.

			
var screenCtx; //for another canvas to demonstrate scrolling
var scroll; //move to global since also used by particle drawing. (should amend this...)

//for framerate
var lastDrawTime = 0;
var framesRecently = 0;
var mechanicsLeadTime = 0;
var mechanicsTimestep = 10; //10ms so 100 fps mechanics 

var mouseX =0;
var mouseY =0;
var mouseClicked = false;


//really should learn about ho to use objects to organise things! eg using something to make vectors
var cursor_x=50;
var cursor_y=48;
var cursor_vx=0;
var cursor_vy=0;


//background image for parallax. some simple system where paste it only if loaded - if add more resources to game, better to ensure all loaded and only then 
//ran rendering code
var bgImg;
var bgImgLoaded = false;


var keyThing;	//used in conjnuction with js_utils/keys.js



var bombs = {};	//this should probably be some kind of object so can have method to draw all etc
var bombidx =0;	//every time make a new bomb increase this. realistically probebl no problem with fact number is limited, but bothersome...

//taken from fullscreen test project
window.onresize = aspectFitCanvas;		//this works if not explicitly using HTML5. ?!!!!!!!
//window.onresize = aspectFitCanvas;
   
   
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

	canvas = document.getElementById('canvas');
	canvas.addEventListener("mousedown", respondToMouseclick);
    canvas.addEventListener("mouseup", respondToMouseup); 
    canvas.addEventListener("mouseout", respondToMouseup); //treat as same as unclicking mouse.      
    canvas.addEventListener("mousemove", respondToMousemove);
    
	canvas.style.backgroundColor='rgba(0, 0, 0, 255)';

	//load level image
	levelImage = new Image();
	levelImage.onload = function(){
		console.log('level image loaded');
		levelImageLoaded = true;
		afterLoadFunc();
	}
	levelImage.src = "img/egypt_level1-t.png"; //-t is black changed to transparent

	levelIndestImage = new Image();
	levelIndestImage.onload = function(){
		console.log("indestructible part of level loaded");
		levelIndestImageLoaded = true;
		afterLoadFunc();
	}
	levelIndestImage.src = "img/egypt_level1i-t.png";
	
	//background image
	bgImg = new Image();
	bgImg.onload = function(){
		console.log('background image loaded');
		bgImgLoaded = true;
		afterLoadFunc();
	}
	bgImg.src = "img/desertdull.png";
	
	
	
	
	//test? have a 2nd canvas to draw collision data into?

	
	//temp - make other canvas visible
	var screencanvas = document.getElementById('screencanvas');
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
	keyThing.setKeydownCallback(106,function(){			//106 = numeric pad "*" (shouldn't clash)
		console.log("dropped a bomb!");
		new Bomb(cursor_x, cursor_y, cursor_vx, cursor_vy);
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
			new Bomb(cursor_x, cursor_y, vx, vy);
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
			new Bomb(cursor_x, cursor_y, vx, vy);
		}
	});
	//todo generalise weapon properties and stick them in another file.
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
                //thisImageDataData[idx]=255
                //thisImageDataData[idx+1]=255
                //thisImageDataData[idx+2]=255
                //thisImageDataData[idx+3]=255

				dataView8[cdata_idx]=1;
				
				//dataViewSinglePix[cdata_idx >>> 4] |= ( 1 <<(cdata_idx & 15));		//this isn't efficient, but not really important since done during loading
				dataViewSinglePix[cdata_idx >>> 4] |= ( 1 << ((cdata_idx & 15)*2) );		//this isn't efficient, but not really important since done during loading
				
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
	return getCollisionPixelData(y*512 + x); //optimise with bit shift?
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
	

	
	//for entire level image showing at top of the screen
    //copy from the offscreen level canvas to the on-screen canvas
   // ctx.drawImage(canvas2,timestamp % 10,0);
    //ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,255,0,1)";
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(canvas2,0,0);

	
	//same thing for smaller second canvas to demo scrolling
	var sc_h = screencanvas.height;
	var sc_w = screencanvas.width;
	
		
	//var scroll = (timestamp/4) % (1024-sc_h);    //height of level - heigh of screen
	
	var scroll_max = canvas2.height - sc_h;

    var interpFactor = mechanicsLeadTime / mechanicsTimestep; 	//interpolated position 
	var interp_cursor_x = cursor_x - cursor_vx*interpFactor;
	var interp_cursor_y = cursor_y - cursor_vy*interpFactor;
	
	scroll = Math.min( Math.max( interp_cursor_y - (sc_h/2) , 0 ) , scroll_max ); // centre cursor, but don't scroll beyond end of level
	
	
	if (bgImgLoaded == true){
		//screenCtx.drawImage(bgImg, 0,0, 256,256,
		//				0,0, 512,512);			// stretches 256*256 background image to fill 512*512 screen - does not scroll
		
		//blow up subsection of background, such that background scrolls slower than level
		//to do this, since half of the level is shown at a time, more than half of the background should be shown at a time.
		
		//show 196*196 of 256*256 at a time, x centred, y from touching top to touching bottom.
		screenCtx.drawImage(bgImg, 32 ,64*scroll/scroll_max, 192 ,192,
						0,0, 512,512);
						
		//log these numbers to help investigate problems on osx safari
		//console.log( "_drawImage number %f" , 64*scroll/scroll_max );
						
		//scroll background with foreground (check looks ok)				
		//screenCtx.drawImage(bgImg, 64 ,scroll/scroll_max * 128, 128 ,128,
		//				0,0, 512,512);			
						
	} else {
		screenCtx.fillStyle = "rgba(0,255,0,1)";	//probably don't need to set this every frame, but will replace with parallax bg anyway
		screenCtx.fillRect(0,0,sc_w, sc_h);
	}
	
	
	screenCtx.drawImage(canvas2, 0,scroll, sc_w,sc_h,
                                        0,0, sc_w, sc_h);	//copy from relevant part of destructible canvas, given scroll value to on-screen canvas 
	if (canvas2i){
		screenCtx.drawImage(canvas2i, 0,scroll, sc_w,sc_h,
                                        0,0, sc_w, sc_h);	//same for indestructible part (this is a temporary, inefficient solution!)
	}
	
	//put a cursor image on screen - intend to use this as a "player object" to demonstrate scrolling level by moving object
	
	
	var coldatapix= ~~cursor_x  + 512*~~cursor_y;	//might fail if outside of bounds
	//console.log(".. " + coldatapix + ".." + collisionData[coldatapix]);

	screenCtx.fillStyle = ( collisionData8View[coldatapix]==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x-5,interp_cursor_y-scroll-5,10, 10);
	
	screenCtx.fillStyle = ( getCollisionPixelData(coldatapix)==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x-3,interp_cursor_y-scroll-3,10, 10);
	
	//indicate on the whole level canvas at top of screen where scrolled to
	//ctx.fillStyle = "rgba(255,0,255,1)";	//magenta
    //ctx.fillRect(cursor_x-5,scroll-5,10, 10);
	
	for (var b in bombs){
		//console.log("processing a bomb in draw loop");
		bombs[b].draw();	//this should go in the draw bit
	}
	
	//for framerate
    //var timeDiff = timestamp - lastDrawTime;
    //lastDrawTime = timestamp;
    var multiplier = Math.pow(0.999, timeDiff);
    framesRecently*= multiplier;
    framesRecently++;
    screenCtx.strokeText( framesRecently.toFixed(1) , 50,50);
	
}


function respondToMouseup(evt){
    mouseClicked=false;
}

function respondToMousemove(evt){
    mouseX = evt.offsetX;
    mouseY = evt.offsetY;
}


function respondToMouseclick(evt){
    mouseClicked = true;
    mouseX = evt.offsetX;
    mouseY = evt.offsetY;
    makeACircle(evt);
}


function makeACircle(evt){
    
	var x = evt.offsetX;
	var y = evt.offsetY;
	myconsolelog("making a circle - x = " + x + ", y = " + y);

	//should draw a hole on canvas.
	
    //to time how long this takes
    var startTime = Date.now();
    
    
    //radio button controls
	var radius = 100;
    var radii = document.getElementsByName('cutradius');
    for(var i = 0; i < radii.length; i++){
        if(radii[i].checked){
            radius = parseInt(radii[i].value);
        }
    }
	
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
	
	//console.log( "levelxblockstart = " + levelxblockstart + ", levelxblockend = " + levelxblockend);
	
	cutblockxstart = (startx+15 - (x- radius)) >>> 4; 
	//console.log( "cutblockxstart = " + cutblockxstart + ", xoffs = " + xoffs);
	
	for (var jj = starty; jj<endy;jj++){	//loop over rows

		//initial version of this - unoptimised - will be able to pull out stuff from inner loop once check works ok
		//loop over level blocks. 
		
		yincutmask = jj - (y-radius); 
	
		//console.log("yincutmask = " + yincutmask);
		
		for (blockx = levelxblockstart; blockx<levelxblockend; blockx++ ){
			blockidx = (512/16)*jj + blockx;
			
			//cutblockx = blockx - ( (x- radius) >>> 4 ) -1;
			
			cutblockx = cutblockxstart + blockx-levelxblockstart -1;	//this can be optimised to precalc cutblockxstart - levelxblockstart - 1
			
			cutblocka = ((radius*2)/16)*yincutmask + cutblockx;			//this can be optimised to precalc ((radius*2)/16)*yincutmask
			cutblockb = cutblocka + 1;
			
			cutblockmask=0;
			
			//get roughly working ?
			if (cutblockx>=0){
				cutblockmask|= dataViewSinglePix[cutblocka] >>> (16-xoffs)*2;			//this can be optimised by simply assigning to cutblockx
																					//and by carrying over previous dataViewSinglePix[cutblockb] instead of looking up afresh
																					//this also means can avoid this if.
																						//*2 since switched from 16 to 32 bits
			} else {
				cutblockmask|= 0xffffffff >>> (16-xoffs)*2;	//affects left hand side.
			}
				
			if (cutblockx +1 <(radius*2/16)){									//can optimise by precalc radius*2/16 . alternatively, can avoid ifs entirely...
				cutblockmask|= dataViewSinglePix[cutblockb] << xoffs*2;			//*2 since switched from 16 to 32 bits
			} else {
				cutblockmask|= 0xffffffff << xoffs*2;			//*2 since switched from 16 to 32 bits, and ffff -> ffffffff
			}
			
			//console.log("blocka = " + cutblocka + ", cutblockmask = " + cutblockmask);
			
			collisionDataDoubleBits32View[blockidx] &= cutblockmask;
			
		}

	
	}

	
	myconsolelog("time to cut circle single bits: " + (getTimestamp() - startTime));
	startTime = getTimestamp();
	
	
	if (testColCanvasActive == true){updateCollisionTestCanvas();}

	myconsolelog("time to update canvas: " + (getTimestamp() - startTime));
	
}

function updateCollisionTestCanvas(){
	//simply draw black/white to test canvas from collision data.
	//to demonstrate updating OK.
	//method is slow but who cares
	var testctx = testcanvas.getContext('2d');

	testctx.fillStyle="black";
	testctx.fillRect(0,0,512,1024);
	
	testctx.fillStyle="white";
	var pix = 0;
	
	for (var yy=0; yy<1024;yy++){
		for (var xx=0; xx<512;xx++){
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
	for (var yy=0; yy<1024;yy++){
		for (var xx=0; xx<512;xx++){
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
	for (var yy=0; yy<1024;yy++){
		for (var xx=0; xx<512;xx++){
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
	for (var yy=0; yy<1024;yy++){
		for (var xx=0; xx<512;xx++){
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
	/*
    //take chunks out of terrain at random
    if (mouseClicked == true){
        for (var circle=0;circle<4;circle++){
            var randSize = 100;
            var circleX = (mouseX - randSize + (2*randSize)*Math.random()) | 0;
            var circleY = (mouseY - randSize + (2*randSize)*Math.random()) | 0;
            makeACircle({offsetX:circleX, offsetY:circleY});

            console.log("circleX : " + circleX + ", circleY : " + circleY );
            //var fakeEvent;
            //fakeEvent.offset
        }
    }
	*/
	
	//movement.
	cursor_vx += 0.2 * (keyThing.rightKey() - keyThing.leftKey());
	cursor_vy += 0.2 * (keyThing.downKey() - keyThing.upKey());
	cursor_vx*=0.95;
	cursor_vy*=0.95;
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
	
	
	
	for (var b in bombs){
		//console.log("processing a bomb in game loop");
		bombs[b].iterate();
	}
	
}


function makeRandomCircles(){
	var circnum, circleX, circleY;
	for (circnum=0;circnum<20;circnum++){
        circleX = 512*Math.random() | 0;
        circleY = 1024*Math.random() | 0;		
		makeACircle({offsetX:circleX, offsetY:circleY});
	}
}

//this might sort of work
//will also want some method to add co-ords together.
//can use something like this to make multiple vector stores, but then should have some way to add/subtract them etc
//therefore maybe better to only have 1 central vector store, then other things can list indices in this store. ???
/*
function vecStore2D(){
	var coordX = [];
	var coordY = [];
	var setVec = function(ii,xx,yy){
		coordX[ii]=xx;
		coordY[ii]=yy;
	}
	var getVec = function(ii){
		return {
			x: coordX[ii],
			y: coordY[ii]
		}
	}
}*/

//from tutorial: https://www.youtube.com/watch?v=YCI8uqePkrc
function Bomb(x,y,vx,vy){
	this.x = x;
	this.y = y;
	this.vx = vx;
	this.vy = vy;
	this.alive = true;
	this.id = bombidx;
	bombs[bombidx++]=this;
}
Bomb.prototype.iterate = function(){
	this.x+=this.vx;
	this.y+=this.vy;
	this.vy+=0.025;
	
	//world limits
	var willDestroy = false;
	if (this.x<0){this.x=0; willDestroy=true;}
	if (this.y<0){this.y=0; willDestroy=true;}
	if (this.x>=512){this.x=512; willDestroy=true;}
	if (this.y>=1024){this.y=1024; willDestroy=true;}

	if (willDestroy==true){
		this.destroy();
	} else if (getCollisionPixelDataXY(~~this.x,~~this.y)!=0){
		//collision with arena....
		//seems like a risk here that ~~ could get some number outside of arena despite checking the above....	
		this.destroy();
	}
}
Bomb.prototype.destroy = function(){
	this.alive = false;
	makeACircle({offsetX:~~this.x, offsetY:~~this.y});
	delete bombs[this.id];
}
Bomb.prototype.draw = function(){
	screenCtx.fillStyle="white";	
	if (this.alive==true){
		//should actually remove the bomb when it is destroyed! when do that, no point in the if here.
		//console.log( "drawing a bomb at x = " + this.x + ", y = " + this.y);
		screenCtx.fillRect(this.x-2,this.y-scroll-2,4,4);	//note this has no interpolation currently 
	}
}

function gaussRand(){
	//note currently generally becomes bigger as increase numTimes. (maybe should divide by sqrt(numtimes?))
	var sqrtNumTimes = 2;
	var numTimes = sqrtNumTimes*sqrtNumTimes;
	var total = -numTimes/2;
	for (var ii=0;ii<numTimes;ii++){
		total+=Math.random();
	}
	return total/sqrtNumTimes;
}



function afterLoadFunc(){
	if (bgImgLoaded & levelImageLoaded & levelIndestImageLoaded){
		console.log("all images loaded");
	} else {
		console.log("not all images loaded. returning");
		return;
	}
	
	
	setupCircleImageAndColData(8);
	setupCircleImageAndColData(16);
	setupCircleImageAndColData(24);
    setupCircleImageAndColData(48);
	setupCircleImageAndColData(96);
	setupCircleImageAndColData(192);
	setupCircleImageAndColData(384);
	
	
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
	var levelImageData = ctx2.getImageData(0,0,512,1024).data;	//not sure this is the most direct way to go getting data from image
	console.log("imagedata length = " + levelImageData.length);
	var numPix = 512*1024;
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
	var levelImageDatai = ctx2i.getImageData(0,0,512,1024).data;	//not sure this is the most direct way to go getting data from image
	console.log("imagedata length (indest) = " + levelImageDatai.length);
	var numPix = 512*1024;
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
	}
	
	//kick off draw loop
    window.requestAnimationFrame(updateDisplay);
	
}