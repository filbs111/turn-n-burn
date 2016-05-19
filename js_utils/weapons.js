"use strict";

var weapons = (function generateWeapons(){
	var weaponsArr = new Array();
	
	console.log("generating weapons!");
	
	//lots of variables eventually
	//should cover things like spread shots, randomness, waves
	//cluster bombs should be covered by weapons system somehow - eg a shot exploding is like firing a "weapon"
	
	weaponsArr.push(new Weapon({
		'name': 'drop',
		'shot_type': '1',
		'muz_vel': 0,
		'fire_interval': 8,
		'shot_type_index': 1
	}));
	weaponsArr.push(new Weapon({
		'name':'standard gun',
		'shot_type': '2',
		'muz_vel': 4,
		'fire_interval': 6,
		'shot_type_index': 1,
		'spray': 1
	}));
	weaponsArr.push(new Weapon({
		'name': 'rear gun',
		'shot_type': '1',
		'muz_vel': -2,
		'fire_interval': 2,
		'shot_type_index': 1
	}));
	weaponsArr.push(new Weapon({
		'name': 'fast gun',
		'shot_type': '1',
		'muz_vel': 16,
		'fire_interval': 4,
		'shot_type_index': 1
	}));
	
	//TODO have something that can load in some JSON
	//json can be constructed from some spreadsheet
	//that way can easily compare weapon properties etc.
	
	console.log("weapons array : " + JSON.stringify(weaponsArr));
	
	return weaponsArr;
})();


function Weapon( configObj ){
	this.name = configObj["name"];
	this.shot_type = configObj["shot_type"];
	this.muz_vel = configObj["muz_vel"];
	this.fire_interval = configObj["fire_interval"];
	this.spray = configObj.spray | 0;
}

//same idea as _set_stype from gfx.dba
function Shot( configObj ){
	this.damage = configObj["damage"] | 0;
	this.mass = configObj["mass"] | 1;
	this.wall_mode = configObj["wall_mode"] | 0;
	this.prox_mode = configObj["prox_mode"] | 0;
	this.radius = configObj["radius"] | 0;
	this.timer = configObj["timer"] | 0;
	this.kinetic_mode = configObj["kinetic_mode"] | 0;
	this.blast_image = configObj["blast_image"] | 0;
	this.blast_power = configObj["blast_power"] | 0;
	this.exp_size = configObj["exp_size"] | 0;
	this.exp_speed = configObj["exp_speed"] | 0;
	this.exp_type = configObj["exp_type"] | 0;
	this.drag = configObj["drag"] | 0;
	//TODO some way to use constants eg someObject.WALL_MODE_BOUNCE
	
	//other things? 
	//rotation (eg for bananas)
	//shots that disperse other shots continually? 
}
Shot.WALL_MODE_BOUNCE =0;
Shot.WALL_MODE_EXPLODE =1;