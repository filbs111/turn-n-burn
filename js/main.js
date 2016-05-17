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

var preMadeCircleImage = [];


//for framerate
var lastDrawTime = 0;
var framesRecently = 0;

var mouseX =0;
var mouseY =0;
var mouseClicked = false;




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


    	//kick off draw loop
        window.requestAnimationFrame(updateDisplay);

        
        preMadeCircleImage[50] = premakeCircleImage(50);
        preMadeCircleImage[100] = premakeCircleImage(100);
        preMadeCircleImage[200] =premakeCircleImage(200);
        preMadeCircleImage[400] =premakeCircleImage(400);
        
        ctx.font = "30px Arial";

		aspectFitCanvas();
		canvas.style.display = 'block';
	}
	levelImage.src = "img/egypt_level1-t.png"; //-t is black changed to transparent

	//test? have a 2nd canvas to draw collision data into?

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
    
    //copy from the offscreen level canvas to the on-screen canvas
   // ctx.drawImage(canvas2,timestamp % 10,0);
    //ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,255,0,1)";
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(canvas2,0,0);

    //for framerate
    var timeDiff = timestamp - lastDrawTime;
    lastDrawTime = timestamp;
    var multiplier = Math.pow(0.999, timeDiff);
    framesRecently*= multiplier;
    framesRecently++;
    ctx.strokeText( framesRecently.toPrecision(2) , 50,50);

    
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
    
    //how to do recurring on loop? 
    //for now, put on frame update.
    
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
    var cuttype =1;
    var radii = document.getElementsByName('cutradius');
    for(var i = 0; i < radii.length; i++){
        if(radii[i].checked){
            radius = parseInt(radii[i].value);
        }
    }
    var cuttypes = document.getElementsByName('cuttype');
    for(var i = 0; i < cuttypes.length; i++){
        if(cuttypes[i].checked){
            cuttype = cuttypes[i].value;
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