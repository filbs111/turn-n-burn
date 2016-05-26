//something to draw to
//constructor will take in canvas, will store context, will have a player associated, settings for where to scroll to etc

function Screen(canvasElement, targetx){
	this.canvasElement = canvasElement;
	this.context = canvasElement.getContext('2d');
	this.target = targetx;
	this.width = canvasElement.width;
	this.height = canvasElement.height;
	this.scroll_max_x = canvas2.width - this.width;
	this.scroll_max_y = canvas2.height - this.height;
}
Screen.prototype.setTarget = function(target){
	this.target = target;
}
Screen.prototype.render = function(){
	var sc_w = this.width;
	var sc_h = this.height;
	var scroll_max_x = this.scroll_max_x;
	var scroll_max_y = this.scroll_max_y;
	
	var target = this.target;
	var cosGunAngle = target.cosAng;
	var sinGunAngle = target.sinAng;
	
	var ctx = this.context;
	interp_cursor_x = target.x - target.vx*interpFactor;
	interp_cursor_y = target.y - target.vy*interpFactor;

	//note using scrl_x,y instead of scroll since still wish to set global variable for bomb, explosion drawing for now.
	var scrl_x = Math.min( Math.max( interp_cursor_x - (sc_w/2) , 0 ) , scroll_max_x );
	var scrl_y = Math.min( Math.max( interp_cursor_y - (sc_h/2) , 0 ) , scroll_max_y ); // centre cursor, but don't scroll beyond 
	
	ctx.drawImage(assetManager.asset.BG, (2048-sc_w)/32 + scrl_x/16, (2048-sc_h)/32 + scrl_y/16 , 
		sc_w/8 ,sc_h/8,
		0,0, sc_w,sc_h);
		//note this does not centre view - ends up on the left, for	images taller than wide.
		
	ctx.drawImage(canvas2, scrl_x,scrl_y, sc_w,sc_h,
                                        0,0, sc_w, sc_h);	//copy from relevant part of destructible canvas, given scroll value to on-screen canvas 
	if (canvas2i){
		ctx.drawImage(canvas2i, scrl_x,scrl_y, sc_w,sc_h,
                                        0,0, sc_w, sc_h);	//same for indestructible part (this is a temporary, inefficient solution!)
	}
	
	var coldatapix= ~~target.x  + LEVEL_WIDTH*~~target.y;	//might fail if outside of bounds
	//console.log(".. " + coldatapix + ".." + collisionData[coldatapix]);

	ctx.fillStyle = ( collisionData8View[coldatapix]==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    ctx.fillRect(interp_cursor_x-scrl_x-5,interp_cursor_y-scrl_y-5,10, 10);
	
	ctx.fillStyle = ( getCollisionPixelData(coldatapix)==1 ? "rgba(255,0,0,1)" : "rgba(255,255,255,1)");	//red or white
    ctx.fillRect(interp_cursor_x-scrl_x-3,interp_cursor_y-scrl_y-3,10, 10);
	
	//ctx.fillStyle = "rgba(255,0,255,1)";	//magenta  //indicate on the whole level canvas at top of screen where scrolled to
    //ctx.fillRect(cursor_x-5,scrl-5,10, 10);
	
	//draw triangle for spaceship
	ctx.strokeStyle = rocketColour;
	ctx.fillStyle = rocketColour;
	ctx.beginPath();
	var backx = interp_cursor_x-scrl_x - gunLength*0.4*sinGunAngle;
	var backy = interp_cursor_y-scrl_y + gunLength*0.4*cosGunAngle;
	ctx.moveTo(interp_cursor_x-scrl_x + gunLength*sinGunAngle , interp_cursor_y-scrl_y - gunLength*cosGunAngle);
	ctx.lineTo(backx + gunLength*0.6*cosGunAngle , backy + gunLength*0.6*sinGunAngle);
	ctx.lineTo(backx + gunLength*0.1*sinGunAngle, backy - gunLength*0.1*cosGunAngle);	//indented back
	ctx.lineTo(backx - gunLength*0.6*cosGunAngle , backy - gunLength*0.6*sinGunAngle);
	ctx.lineTo(interp_cursor_x-scrl_x + gunLength*sinGunAngle , interp_cursor_y-scrl_y - gunLength*cosGunAngle);
	ctx.fill();
	ctx.stroke();
	
	
	//draw some line to show normal vector for where spaceship is (to test)
	var sshipNormal = getNormal(~~target.x, ~~target.y);
	ctx.strokeStyle = 'red';
	ctx.beginPath();
	ctx.moveTo(target.x -scrl_x , target.y -scrl_y );
	ctx.lineTo(target.x + sshipNormal.x*100 -scrl_x , target.y + sshipNormal.y*100 -scrl_y );
	ctx.stroke();
	
	//commented out normals bit for now since unimportant
	
	//set global screenCtx, scrl_x,y so draw bombs to the right canvas.
	screenCtx = ctx;
	scroll_x = scrl_x;
	scroll_y = scrl_y;
	for (var b in bombs){
		//console.log("processing a bomb in draw loop");
		bombs[b].draw();
	}
	ctx.globalCompositeOperation = "screen";
	for (var e in explosions){
		explosions[e].draw();
	}
	ctx.globalCompositeOperation = "source-over"; //set back to default
	
	ctx.strokeText( framesRecently.toFixed(1) , 50,50);
} 