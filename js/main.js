//load in a level image
//generate collision data for the level image
//simple way to do this - array of numbers (64 bits each is overkill, but just check it works!)

//when blow a hole in landscape - draw to canvas AND edit collision data
//this is error prone - 
//alternative is to edit image and get collision data by reading it, but trouble there since
//possibly some dependence on browser, graphics card etc

//also possibly may wish to separately load collision data, since can have separate destructuble, not, without
//using pallette to describe this, or mulitple images (desr, indest)

//actually, if don't want multiple images for destr, indest, may be doing own drawing to canvas
//(rather than cutting pre-made circles. 

//alternative ? re-paste indest tiles to affected areas?

//initial test - just get simple case of all destructible working.



//optimise: 
//speed of update on destruction
//use of memory

//what debug tools? how can i stress?

//how to test on lower end systems ?
// netbook
// at work



//add scrolling
//add fullscreen
//add a smoothness tester - something that rotates/moves across screen

//what is effect on framerate of level size?
//can level be loaded with transparency?


//do manual updating of a collision array



//if have indestructible level too - what is effect on framerate ?
  //option 1 - always paste indest level onto main screen canvas on top of indest
  //option 2 - repaste from indest to destr canvas to cover dirty squares - this seems like should be generally better for framerate while nothing happening
        //can also keep texture size smaller if using tiled levels - can repaste tiles.


//if performance acceptable for now, write up untested options. eg...

//are other globalcomposite options suitable/faster? eg xor

//can get more speed by using pre-declared int32 array?
//what about commands to copy imagedata?

//if can't copy only part of imagedata to canvas
// and update canvas with entire imagedata is slow
//then can have blocks or strips of level as imagedata, offscreen canvases.
//only update dirtied blocks

//possibly still useful for canvas -> canvas even if using globalcompositeoperation instead of imagedata






var ctx;
var canvas;
var canvas2;
var ctx2;   //2nd canvas for intermediate rendering of level image with transparency
var lw;
var lh;

var testcanvas;	//to draw collision detection data to check it looks OK

var preMadeCircleImage = [];

var collisionData= [512*1024];

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
var cursor_x=0;
var cursor_y=0;
var cursor_vx=0;
var cursor_vy=0;


var leftKey = false;
var rightKey = false;
var upKey = false;
var downKey = false;



//background image for parallax. some simple system where paste it only if loaded - if add more resources to game, better to ensure all loaded and only then 
//ran rendering code
var bgImg;
var bgImgLoaded = false;


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
};




window.onload = function() {

	canvas = document.getElementById('canvas');
	canvas.addEventListener("mousedown", respondToMouseclick);
    canvas.addEventListener("mouseup", respondToMouseup); 
    canvas.addEventListener("mouseout", respondToMouseup); //treat as same as unclicking mouse.      
    canvas.addEventListener("mousemove", respondToMousemove);
    
	canvas.style.backgroundColor='rgba(0, 0, 0, 255)'

	//load level image
	var levelImage = new Image();
	levelImage.onload = function(){
		console.log('level image loaded');

		lw = levelImage.width;
		lh = levelImage.height

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
			collisionData[ii] = levelImageData[jj]===0 ? false:true;	//should be a binary array. should make more compact somehow.
																		//populate collision array from alpha channel of level image.
		}

    	//kick off draw loop
        window.requestAnimationFrame(updateDisplay);

        
        preMadeCircleImage[50] = premakeCircleImage(50);
        preMadeCircleImage[100] = premakeCircleImage(100);
        preMadeCircleImage[200] =premakeCircleImage(200);
        preMadeCircleImage[400] =premakeCircleImage(400);
        
        ctx.font = "30px Arial";

		aspectFitCanvas();
		canvas.style.display = 'block';
		
		
		//size and show test canvas for level collision data test
		testcanvas = document.getElementById("coldetcanvas");
		testcanvas.width = lw;
        testcanvas.height = lh;
	//	testcanvas.style.display = 'block';
		updateCollisionTestCanvas();
		
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
	
	
	//intialise controls
	document.addEventListener('keydown', keyDown, false);
	document.addEventListener('keyup', keyUp, false);
	
}



function premakeCircleImage(rad){
    var size= rad*2;
    var thisImageData = ctx.createImageData(size,size);
    var thisImageDataData = thisImageData.data;
    //draw a circle. slow but only done once per size
    var radsq = rad*rad;
    var ii,jj,jsq,rsq,idx=0;
    for (jj=0;jj<size;jj++){
        jsq=(jj-rad)*(jj-rad);  //this can be sped up
        for (ii=0;ii<size;ii++){
            rsq = (ii-rad)*(ii-rad) + jsq;  //this can be sped up!
            if (rsq<radsq){
                thisImageDataData[idx]=255
                thisImageDataData[idx+1]=0
                thisImageDataData[idx+2]=0
                thisImageDataData[idx+3]=255
            } else {
                //thisImageDataData[idx]=255
                //thisImageDataData[idx+1]=255
                //thisImageDataData[idx+2]=255
                //thisImageDataData[idx+3]=255
            }
            idx+=4;
        }
    }
    
    var tmpCanvas = document.createElement("canvas"); //does this get cleaned up after use???
    tmpCanvas.width = size;
    tmpCanvas.height = size;
    var tmpCtx = tmpCanvas.getContext("2d");
    tmpCtx.putImageData(thisImageData,0,0);
    
    return tmpCanvas;
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
	console.log("mouse clicked - x = " + x + ", y = " + y);

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

	
	//update collision data. 
	//TODO
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
			if (collisionData[pix]==true){
				testctx.fillRect(xx,yy,1,1);
			}
			pix++;
		}
	}
	
}

function updateMechanics(){
	
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
	
	//movement.
	cursor_vx += 0.2 * (rightKey - leftKey);
	cursor_vy += 0.2 * (downKey - upKey);
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
	
}


//controls
function keyDown(e) {
	e.preventDefault();
	//perhaps more sensible to maintain a set of currently pressed keys
  if (e.keyCode == 39) rightKey = true;
  else if (e.keyCode == 37) leftKey = true;
  if (e.keyCode == 38) upKey = true;
  else if (e.keyCode == 40) downKey = true;
}
function keyUp(e) {
	e.preventDefault();

  if (e.keyCode == 39) rightKey = false;
  else if (e.keyCode == 37) leftKey = false;
  if (e.keyCode == 38) upKey = false;
  else if (e.keyCode == 40) downKey = false;
}
