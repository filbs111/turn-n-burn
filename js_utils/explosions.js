

//initially just tidy existing explosion test thing, taking bombs implementation as template.
	//note that a lot of stuff is shared, so maybe nice to make bombs, explosions, player etc all "inherit" from gameObject or something.
	
	
	//this stuff shouldn't really be globals!
	//TODO put on Explosion at least!
	
	//things like screenCtx should maybe be in some function where initialise this whole explosions thing
	//possibly scrollx, scrolly should be set every frame too..
	
	var explosions = {};
	var explosion_idx = 0;
	
	function Explosion(x,y,vx,vy,scale,speed){
		this.x = x;
		this.y = y;
		this.vx = vx;
		this.vy = vy;
		this.id = explosion_idx;
		this.scale = scale;
		this.maxlife = 29;	//hard coded for now - this is basically determined by the sprite sheet
		this.life = 29;
		this.speed = speed;
		explosions[explosion_idx++]=this;
	}
	Explosion.prototype.spriteSheetStep = 128;
	Explosion.prototype.spriteSheetXDivs = 6;
	Explosion.prototype.spriteSheetYDivs = 5;
	Explosion.prototype.iterate = function(){
		this.life-=this.speed;
		if (this.life <= 0){
			delete explosions[this.id];
			return;
		}
		this.x+=this.vx;
		this.y+=this.vy;
	}
	Explosion.prototype.draw = function(){
		//convert from life (#0 to 29) to co-ords on source canvas
		var uplife = this.maxlife - this.life;	//maybe better to just count up!
		var ySquare = (uplife/ this.spriteSheetXDivs)|0;
		var xSquare = (uplife % this.spriteSheetXDivs)|0;
		var xStart = xSquare * this.spriteSheetStep;
		var yStart = ySquare * this.spriteSheetStep;
		var scale = this.scale, x=this.x, y=this.y;
		screenCtx.drawImage(assetManager.asset.EXPL, xStart, yStart, this.spriteSheetStep, this.spriteSheetStep,
                            x-scale -scroll_x ,y-scale -scroll_y,2*scale,2*scale );
	}
	
	//as yet unused... 
	/*
	function setupExplosionImage(){
		//want this to go in file with explosion stuff as much as pos.
	
		//load a explosion image
		explImg = new Image();
		explImg.onload = function(){
			window.requestAnimationFrame(updateDisplay);
			//updateDisplay();
		};
		//explImg.src='img/expl10-alphaed.png';
		explImg.src='img/expl10.png';
	}
	*/