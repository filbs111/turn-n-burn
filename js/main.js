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

var ctx;
var canvas;
var canvas2;
var ctx2;   //2nd canvas for intermediate rendering of level image with transparency
var lw;
var lh;

var testcanvas;	//to draw collision detection data to check it looks OK

var preMadeCircleImage = [];

var collisionData= [512*1024];
var preMadeCircleColData= [];


//do collision data in a more efficient way
//using typed array should ensure is dense array.
//also, can use smaller number of bits per pixel 
//in future, can use offset views and store more than 1 pixel of data
//per value in the array (eg 16 pixels in one 16 bit number)

//for now just use 1 value per pixel to see how stacks up against standard
//array

var collisionData32Buffer = new ArrayBuffer(512*1024*4);	//*4 because 4 bytes for a 32 bit number
var collisionData32View = new Uint32Array(collisionData32Buffer);
var preMadeCircleColData32View= [];

var collisionData16Buffer = new ArrayBuffer(512*1024*2);	//*2 because 2 bytes for a 16 bit number
var collisionData16View = new Uint16Array(collisionData16Buffer);
var preMadeCircleColData16View= [];

var collisionData8Buffer = new ArrayBuffer(512*1024);
var collisionData8View = new Uint8Array(collisionData8Buffer);
var preMadeCircleColData8View= [];

//single bit per pixel array. 
var collisionDataBufferSingleBits = new ArrayBuffer(512*1024/8);	// over 8 since 1 byte covers 8 pixels
var collisionDataSingleBits16View = new Uint16Array(collisionDataBufferSingleBits);	//split into 16 bits rather than 32 for convenience 
			//3* scaled up GF2 levels are odd multiple of 16. 32 might be twice as fast, but should be quick anyway
//initialise it (unsure if required)
for (var ii=0;ii<512*1024/16;ii++){
	collisionDataSingleBits16View[ii]= 0; // 0xffff;	//all on
}
			
var preMadeCircleColDataSingleBits16View= [];

			
var screenCtx; //for another canvas to demonstrate scrolling


//for framerate
var lastDrawTime = 0;
var framesRecently = 0;
var mechanicsLeadTime = 0;
var mechanicsTimestep = 20; //20ms so 50 fps mechanics 

var mouseX =0;
var mouseY =0;
var mouseClicked = false;


//really should learn about ho to use objects to organise things! eg using something to make vectors
var cursor_x=47;
var cursor_y=48;
var cursor_vx=0;
var cursor_vy=0;


//background image for parallax. some simple system where paste it only if loaded - if add more resources to game, better to ensure all loaded and only then 
//ran rendering code
var bgImg;
var bgImgLoaded = false;


var keyThing;	//used in conjnuction with js_utils/keys.js


//taken from fullscreen test project
window.onresize = aspectFitCanvas;
    
function aspectFitCanvas(evt) {

    var ww = window.innerWidth -2;
    var wh = window.innerHeight -2;
    
    //aspect fit
    if ( ww * canvas.height > wh * canvas.width ) {
        canvas.style.height = wh;
        canvas.style.width = wh * canvas.width / canvas.height;
    } else {
        canvas.style.width = ww;
        canvas.style.height = ww * canvas.height / canvas.width;
    }
	
	//repeat for 2nd canvas (temp)
    //aspect fit
    if ( ww * screencanvas.height > wh * screencanvas.width ) {
        screencanvas.style.height = wh;
        screencanvas.style.width = wh * screencanvas.width / screencanvas.height;
    } else {
        screencanvas.style.width = ww;
        screencanvas.style.height = ww * screencanvas.height / screencanvas.width;
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
	var levelImage = new Image();
	levelImage.onload = function(){
		console.log('level image loaded');

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
			collisionData[ii] = levelImageData[jj]===0 ? false:true; //should be a binary array. should make more compact somehow.
			collisionData32View[ii]	= levelImageData[jj]===0 ? 0:1;		
			collisionData16View[ii]	= levelImageData[jj]===0 ? 0:1;		
			collisionData8View[ii]	= levelImageData[jj]===0 ? 0:1;		
																//populate collision array from alpha channel of level image.
																
			//efficient array. note that this code can probably be optimised ( with loop over 16 bits inside another loop)

			//collisionDataSingleBits16View[ii >>> 4] &= (levelImageData[jj]===0 ? 0:1);	//not complete
			
			collisionDataSingleBits16View[ii >>> 4] |= ( (levelImageData[jj]===0 ? 0:1) <<(ii & 15));
			
			
			//override for testing
			//collisionData8View[ii] =1;
			//collisionDataSingleBits16View[ii>>>4]=0xffff;
		}

    	//kick off draw loop
        window.requestAnimationFrame(updateDisplay);

		setupCircleImageAndColData(8);
		setupCircleImageAndColData(16);
		setupCircleImageAndColData(24);
        setupCircleImageAndColData(48);
		setupCircleImageAndColData(96);
		setupCircleImageAndColData(192);
		setupCircleImageAndColData(384);

		
		/*
        preMadeCircleImage[50] = premakeCircleImage(50);
        preMadeCircleImage[100] = premakeCircleImage(100);
        preMadeCircleImage[200] =premakeCircleImage(200);
        preMadeCircleImage[400] =premakeCircleImage(400);
        */
		
        ctx.font = "30px Arial";

		aspectFitCanvas();
		canvas.style.display = 'block';
	
		if (testColCanvasActive==true){
			//size and show test canvas for level collision data test
			testcanvas = document.getElementById("coldetcanvas");
			testcanvas.width = lw;
			testcanvas.height = lh;
			testcanvas.style.display = 'block';
			updateCollisionTestCanvas();
		}
	}
	levelImage.src = "img/egypt_level1-t.png"; //-t is black changed to transparent

	
	//background image
	bgImg = new Image();
	bgImg.onload = function(){
		console.log('background image loaded');
		bgImgLoaded = true;
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

}



function premakeCircleImage(rad){
	var radsq = rad*rad;
	
	var collisionArray32buffer = new ArrayBuffer(radsq*16);
	preMadeCircleColData32View[rad] = new Uint32Array(collisionArray32buffer);
	var dataView32 = preMadeCircleColData32View[rad];
	
	var collisionArray16buffer = new ArrayBuffer(radsq*8);
	preMadeCircleColData16View[rad] = new Uint16Array(collisionArray16buffer);
	var dataView16 = preMadeCircleColData16View[rad];
	
	var collisionArray8buffer = new ArrayBuffer(radsq*4);
	preMadeCircleColData8View[rad] = new Uint8Array(collisionArray8buffer);
	var dataView8 = preMadeCircleColData8View[rad];
	
	var collisionArraySinglePixBuffer = new ArrayBuffer(radsq*8/16);
	preMadeCircleColDataSingleBits16View[rad] = new Uint16Array(collisionArraySinglePixBuffer);
	var dataViewSinglePix = preMadeCircleColDataSingleBits16View[rad];
	
	//initialise to 0
	for (var ii=0;ii<radsq*4/16;ii++){
		dataViewSinglePix[ii]=0;	
	}	
	
    var size= rad*2;
    var thisImageData = ctx.createImageData(size,size);
    var thisImageDataData = thisImageData.data;
    //draw a circle. slow but only done once per size
    
	var returnColDataArray=[4*radsq];	//this is super slow to run but works.
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
				returnColDataArray[cdata_idx]=false;
				dataView32[cdata_idx]=0;
				dataView16[cdata_idx]=0;
				dataView8[cdata_idx]=0;
				
            } else {
                //thisImageDataData[idx]=255
                //thisImageDataData[idx+1]=255
                //thisImageDataData[idx+2]=255
                //thisImageDataData[idx+3]=255
				returnColDataArray[cdata_idx]=true;
				dataView32[cdata_idx]=1;
				dataView16[cdata_idx]=1;
				dataView8[cdata_idx]=1;
				
				dataViewSinglePix[cdata_idx >>> 4] |= ( 1 <<(cdata_idx & 15));		//this isn't efficient, but not really important since done during loading
				
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
	return {'canvas':	tmpCanvas,
			'cDataArr': returnColDataArray};
}
//below func could be rolled into the above#

function setupCircleImageAndColData(rad){
	var returnedObj = premakeCircleImage(rad);
	console.log(returnedObj);
	preMadeCircleImage[rad] = returnedObj.canvas;
	preMadeCircleColData[rad] = returnedObj.cDataArr;
}

function getCollisionPixelDataXY(x,y){
	return getCollisionPixelData(y*512 + x); //optimise with bit shift?
}
function getCollisionPixelData(pix){
	//collisionDataSingleBits16View[ii >> 4] &= ( (levelImageData[jj]===0 ? 0:1) <<(ii & 15));
	//console.log("pix = " + pix + ", pix >>4 = " + (pix >>4) + ", pix&15 = " + (pix&15));
	return ((collisionDataSingleBits16View[pix >>> 4] >> (pix&15)) &1 );
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
	
	var scroll = Math.min( Math.max( interp_cursor_y - (sc_h/2) , 0 ) , scroll_max ); // centre cursor, but don't scroll beyond end of level
	
	
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
	
	//put a cursor image on screen - intend to use this as a "player object" to demonstrate scrolling level by moving object
	
	
	var coldatapix= ~~cursor_x  + 512*~~cursor_y;	//might fail if outside of bounds
	//console.log(".. " + coldatapix + ".." + collisionData[coldatapix]);
	screenCtx.fillStyle = ( collisionData[coldatapix]==true ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x-5,interp_cursor_y-scroll-5,10, 10);
	
	screenCtx.fillStyle = ( collisionData32View[coldatapix]==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x-3,interp_cursor_y-scroll-3,10, 10);

	screenCtx.fillStyle = ( collisionData16View[coldatapix]==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x-1,interp_cursor_y-scroll-1,10, 10);
	
	screenCtx.fillStyle = ( collisionData8View[coldatapix]==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x+1,interp_cursor_y-scroll+1,10, 10);
	
	screenCtx.fillStyle = ( getCollisionPixelData(coldatapix)==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    screenCtx.fillRect(interp_cursor_x+3,interp_cursor_y-scroll+3,10, 10);
	
	
	/*
	console.log("collisionData32View[coldatapix] = " + (collisionData32View[coldatapix]));
	console.log("collisionData32View length = " + collisionData32View.length);
	*/
	
	//indicate on the whole level canvas at top of screen where scrolled to
	//ctx.fillStyle = "rgba(255,0,255,1)";	//magenta
    //ctx.fillRect(cursor_x-5,scroll-5,10, 10);
	
	
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
	coldata = preMadeCircleColData[radius];
	//super slow version ...
	/*
	for (var ii = startx; ii<endx;ii++){
		var pp = ii-(x-radius);
			for (var jj = starty; jj<endy;jj++){
				var qq = jj-(y-radius);
				var pix2 = pp + (radius*2)*qq;
				var pix = ii + 512*jj;
				collisionData[pix]&=coldata[pix2];
				//collisionData[pix]^=coldata[pix2];	//to make it obvious what's affected by cutting
			}
	}
	*/



/*	
	//marginally faster version
	var ppstart = startx-(x-radius);
	for (var jj = starty; jj<endy;jj++){
		var pix = startx+512*jj;
		var pix2 = ppstart+(radius*2)*(jj-(y-radius));
		for (var ii = startx; ii<endx;ii++){
				collisionData[pix++]&=coldata[pix2++];
				//collisionData[pix++]^=coldata[pix2++];	//to make it obvious what's affected by cutting
			}
	}
	myconsolelog("time to cut circle: " + (getTimestamp() - startTime));
	startTime = getTimestamp();
*/	
/*	
	//version using typed array
	var circArray = preMadeCircleColData32View[radius];
	ppstart = startx-(x-radius);
	var pix,pix2,ii;
	for (var jj = starty; jj<endy;jj++){
		pix = startx+512*jj;
		pix2 = ppstart+(radius*2)*(jj-(y-radius));
		for (ii = startx; ii<endx;ii++){
				collisionData32View[pix++]&=circArray[pix2++];
				//collisionData[pix++]^=coldata[pix2++];	//to make it obvious what's affected by cutting
			}
	}
	myconsolelog("time to cut circle 32: " + (getTimestamp() - startTime));
	startTime = getTimestamp();
*/
/*	
	//version using typed array
	var circArray16 = preMadeCircleColData16View[radius];
	ppstart = startx-(x-radius);
	var pix,pix2,ii;
	for (var jj = starty; jj<endy;jj++){
		pix = startx+512*jj;
		pix2 = ppstart+(radius*2)*(jj-(y-radius));
		for (ii = startx; ii<endx;ii++){
				collisionData16View[pix++]&=circArray16[pix2++];
				//collisionData[pix++]^=coldata[pix2++];	//to make it obvious what's affected by cutting
			}
	}
	myconsolelog("time to cut circle 16: " + (getTimestamp() - startTime));
	startTime = getTimestamp();
*/	
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

	var dataViewSinglePix = preMadeCircleColDataSingleBits16View[radius];
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
				cutblockmask|= dataViewSinglePix[cutblocka] >>> (16-xoffs);			//this can be optimised by simply assigning to cutblockx
																					//and by carrying over previous dataViewSinglePix[cutblockb] instead of looking up afresh
																					//this also means can avoid this if.
			} else {
				cutblockmask|= 0xffff >>> (16-xoffs);	//affects left hand side.
			}
				
			if (cutblockx +1 <(radius*2/16)){									//can optimise by precalc radius*2/16 . alternatively, can avoid ifs entirely...
				cutblockmask|= dataViewSinglePix[cutblockb] << xoffs;
			} else {
				cutblockmask|= 0xffff << xoffs;
			}
			
			//console.log("blocka = " + cutblocka + ", cutblockmask = " + cutblockmask);
			
			collisionDataSingleBits16View[blockidx] &= cutblockmask;
			
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
			if (getCollisionPixelData(pix)==1){
				testctx.fillRect(xx,yy,1,1);
			}
			pix++;
		}
	}
	
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
}


function makeRandomCircles(){
	var circnum, circleX, circleY;
	for (circnum=0;circnum<20;circnum++){
        circleX = 512*Math.random() | 0;
        circleY = 1024*Math.random() | 0;		
		makeACircle({offsetX:circleX, offsetY:circleY});
	}
}