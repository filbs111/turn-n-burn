"use strict";

var thingListMaker = function generateThing(thingClass){
	var thingObj = {};
	thingObj.byName = {};
	
	thingObj.add = function(){
		for(var t = 0; t < arguments.length; t++){
			var thisThing = arguments[t];
			if (thisThing.name){
				thingObj.byName[thisThing.name] = new thingClass(thisThing);
			}
		}
	}
	thingObj.print = function(){
		console.log("weapons array : " + JSON.stringify(thingObj));
	}
	//lots of variables eventually
	//should cover things like spread shots, randomness, waves
	//cluster bombs should be covered by weapons system somehow - eg a shot exploding is like firing a "weapon"

	return thingObj;
}

//same idea as _set_stype from gfx.dba
function Shot( configObj ){
	this.damage = configObj["damage"] || 0;
	this.mass = configObj["mass"] || 1;
	this.wall_mode = configObj["wall_mode"] || 0;
	this.prox_mode = configObj["prox_mode"] || 0;
	this.radius = configObj["radius"] || 0;
	this.timer = configObj["timer"] || 300;
	this.kinetic_mode = configObj["kinetic_mode"] || 0;
	this.blast_image = configObj["blast_image"] || 0;
	this.blast_power = configObj["blast_power"] || 0;
	this.exp_size = configObj["exp_size"] || 8;
	this.exp_speed = configObj["exp_speed"] || 0;
	this.exp_type = configObj["exp_type"] || 0;
	this.drag = configObj["drag"] || 1.0;
	this.fires_weapon = configObj["fires_weapon"];
	//TODO some way to use constants eg someObject.WALL_MODE_BOUNCE

	//other things? 
	//rotation (eg for bananas)
	//shots that disperse other shots continually? 
	console.log("config obj for shot was : " + JSON.stringify(configObj));
	console.log("made a new shot : " + JSON.stringify(this));
	
}
Shot.WALL_MODE_BOUNCE =0;
Shot.WALL_MODE_EXPLODE =1;

var shotTypes = thingListMaker(Shot);

shotTypes.add({
	'name': 'standard',
	'wall_mode': Shot.WALL_MODE_EXPLODE
	},{
	'name': 'bounce',
	'wall_mode': Shot.WALL_MODE_BOUNCE
	},{
	'name': 'big',
	'wall_mode': Shot.WALL_MODE_EXPLODE,
	'exp_size': 24
	},{
	'name': 'para mine',
 	'wall_mode': Shot.WALL_MODE_BOUNCE,
	'drag': 0.95
	},{
	'name': 'cluster',
	'wall_mode': Shot.WALL_MODE_EXPLODE,
	'exp_size': 24,
	'fires_weapon': 'cluster burst'
	},{
	'name': 'grenade',
 	'wall_mode': Shot.WALL_MODE_BOUNCE,
	'exp_size': 24,
	'fires_weapon': 'cluster burst',
	'timer':300
	},{
	'name': 'epic cluster',
	'wall_mode': Shot.WALL_MODE_EXPLODE,
	'exp_size': 24,
	'fires_weapon': 'epic cluster burst'
});

function Weapon( configObj ){
	this.name = configObj["name"];
	this.shot_type = shotTypes.byName[configObj["shot_type"]];
	this.muz_vel = configObj["muz_vel"] || 0;
	this.fire_interval = configObj["fire_interval"];
	this.spray = configObj.spray || 0;
	this.autofire = (configObj.autofire === undefined) ? true : configObj.autofire;
	this.num_projectiles = configObj.num_projectiles || 1;
	this.reset_wave = configObj.reset_wave || false;
	this.wave_start = configObj.wave_start || 0;
	this.v_wave_start = configObj.v_wave_start || this.wave_start;
	this.wave_step = configObj.wave_step || 0;
	this.v_wave_step = configObj.v_wave_step || this.wave_step;
	this.exclude_from_weapons_list = configObj.exclude_from_weapons_list;
}

var weapons = thingListMaker(Weapon);

//adding weapons into the list
weapons.add({
	'name': 'drop',
	'fire_interval': 8,
	'shot_type': 'big',
},{
	'name':'standard gun',
	'muz_vel': 4,
	'fire_interval': 6,
	'shot_type': 'standard',
	'spray': 1
},{
	'name': 'rear gun',
	'muz_vel': -2,
	'fire_interval': 2,
	'shot_type': 'standard'
},{
	'name': 'fast gun',
	'muz_vel': 16,
	'fire_interval': 4,
	'shot_type': 'standard'
},{
	'name': 'rapid fire gun',
	'muz_vel': 1,
	'fire_interval': 1,
	'shot_type': 'standard'
},{
	'name': 'bounce gun',
	'muz_vel': 1.5,
	'fire_interval': 3,
	'shot_type': 'bounce'
},{
	'name': 'continuous spray',
	'fire_interval': 2,
	'shot_type': 'standard',
	'spray': 10
},{
	'name': 'burst spray',
	'fire_interval': 5,
	'shot_type': 'standard',
	'spray': 10,
	'num_projectiles':10
},{
	'name': 'bouncy burst spray',
	'fire_interval': 8,
	'shot_type': 'bounce',
	'spray': 4,
	'num_projectiles':16
},{
	'name': 'semi auto bomb',
	'fire_interval': 20,
	'shot_type': 'big',
	'autofire':false,
},{
	'name': 'shotgun',
	'muz_vel': 2.5,
	'fire_interval': 10,
	'shot_type': 'standard',
	'spray': 0.5,
	'num_projectiles':16,
	'autofire':false
},{
	'name': 'para mines',
	'fire_interval': 10,
	'shot_type': 'para mine'
},{
	'name': 'multidir shot',
	'fire_interval': 20,
	'shot_type': 'big',
	'num_projectiles':18,
	'muz_vel': 3,
	'wave_step': 20
},{
	'name': 'forward multidir shot',
	'fire_interval': 20,
	'shot_type': 'big',
	'num_projectiles':18,
	'muz_vel': 3,
	'wave_step': 10,
	'reset_wave':true,
	'wave_start':-85
},{
	'name': 'reverse multidir shot',
	'fire_interval': 20,
	'shot_type': 'big',
	'num_projectiles':18,
	'muz_vel': 3,
	'wave_step': 10,
	'reset_wave':true,
	'wave_start':95
},{
	'name': 'bullet hell',
	'fire_interval': 3,
	'shot_type': 'standard',
	'num_projectiles':2,
	'muz_vel': 3,
	'wave_step': 231,
	'v_wave_step': 51
},{
	'name': 'cluster bomb',
	'fire_interval': 30,
	'shot_type': 'cluster'
},{
	'name':'cluster burst',
	'shot_type':'big',
	'num_projectiles':9,
	'muz_vel': 3,
	'wave_step': 40,
	'exclude_from_weapons_list':true
},{
	'name':'grenade launcher',
	'fire_interval': 20,
	'shot_type': 'grenade',
	'muz_vel': 3,
	'autofire':false
},{
	'name':'epic cluster bomb',
	'fire_interval': 30,
	'shot_type':'epic cluster'
},{
	'name':'epic cluster burst',
	'shot_type':'cluster',
	'num_projectiles':5,
	'muz_vel': 3,
	'wave_step': 72,
	'exclude_from_weapons_list':true
});
weapons.print();


function fireWeapon(sourceObject){
	//general function that works for players firing weapons, and for cluster bombs etc.
	//as input, take an object of same format as player. 
	
	console.log("sourceObject = " + JSON.stringify(sourceObject));
	
	var currentWeapon = sourceObject.weapon;
	var currentWeaponType = currentWeapon.type;
	
	var cosAng = sourceObject.cosAng;
	var sinAng = sourceObject.sinAng;
		
	var hAng, vAng, forwardMuzvel, sideMuzvel;
				
	for (var shotNum = 0; shotNum<currentWeaponType.num_projectiles; shotNum++){
		
		hAng = Math.PI * (currentWeapon.hwave) / 180;	//note this is very inefficient -
		vAng = Math.PI * (currentWeapon.vwave) / 180; //ideally should precalculate.
		
		forwardMuzvel = currentWeaponType.muz_vel * Math.cos(vAng);
		sideMuzvel = currentWeaponType.muz_vel * Math.sin(hAng);
		
		new Bomb(sourceObject.x, sourceObject.y,
		sourceObject.vx + forwardMuzvel*sinAng + sideMuzvel*cosAng + currentWeaponType.spray*gaussRand() , 
		sourceObject.vy - forwardMuzvel*cosAng + sideMuzvel*sinAng + currentWeaponType.spray*gaussRand() ,
		currentWeaponType.shot_type);
		
		currentWeapon.hwave += currentWeaponType.wave_step;
		currentWeapon.vwave += currentWeaponType.v_wave_step;
	}
}


