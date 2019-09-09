/* 
THREE.js r106 
*/

// Global Variables
let canvas = document.getElementById("myCanvas");
let camera0, scene0, renderer, composer, controls, clock, time=0.0, stats, gui;
let textureLoader, gltfLoader;
let Textures = {};
let Lights = [];
let shadows = false;
let bokehPass, fxaaPass, unrealBloomPass, renderPass;
let pillars , pillarsCustomDepthMat , pillarShader = {} , pillarDepthShader = {};
let perlin;
const lightPos = new THREE.Vector3( -20 , 20 , 20 );

function init() {
	// Renderer
	renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true, powerPreference: "high-performance" } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	if(shadows){ 
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		// renderer.shadowMap.type = THREE.VSMShadowMap;
		renderer.shadowMap.autoUpdate = false;
	}
	// renderer.gammaOutput = true;
	// renderer.gammaFactor = 2.2;
	renderer.physicallyCorrectLights = true;
	
	// Scene
	scene0 = new THREE.Scene();
	scene0.background = new THREE.Color( 0x000000 );
	
	// Camera
	camera0 = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1.0, 100 );
	// camera0.position.set( 29 , 17 , -16 );
	camera0.position.set( 25 , 17 , -18 );
	camera0.lookAt( new THREE.Vector3( -5 , 0 , -2 ) );
	
	// Clock
	clock = new THREE.Clock();
	
	//Stats
	stats = new Stats();
	document.body.appendChild( stats.dom );
	
	//GUI
	gui = new dat.GUI();
	// gui.add(object, property, [min], [max], [step])
	
	// Noise
	perlin = new THREE.ImprovedNoise();
	
	// Loaders
	textureLoader = new THREE.TextureLoader();
	gltfLoader = new THREE.GLTFLoader();

	// Resize Event
	window.addEventListener("resize", function(){
		renderer.setSize( window.innerWidth, window.innerHeight );
		camera0.aspect = window.innerWidth / window.innerHeight;
		camera0.updateProjectionMatrix();
	}, false);
	
	// Inits
	initControls();
	initTextures();
	
	initLights();
	createStartingMesh();
	initPostProcessing();
	
	if( shadows ) renderer.shadowMap.needsUpdate = true;
	
	setInterval( function(  ){
		console.log( renderer.info.render.calls );
	}, 1000/2 );
}

let randomGridPos = function( grid , distanceUnit , origin ){
	let x , y , z;
}

Math.fract = function( x ){
	return x - Math.floor(x);
}

let createStartingMesh = function(){
	
	let boxGeometry = new THREE.BufferGeometry();
	let pos = new Float32Array([
		-1, 1, -1,  
	]);
	
	const timeFactor = 1.0; // 0.05
	
	
	pillarsCustomDepthMat = new THREE.MeshDepthMaterial({
		// depthPacking: THREE.RGBADepthPacking,
		blending: THREE.NoBlending,
		// alphaTest: 0.5
	});
	pillarsCustomDepthMat.onBeforeCompile = function( shader ){
		
		shader.uniforms.uTime = { value: 0.0 };
		shader.uniforms.uTimeFactor = { value: timeFactor };
		
		shader.vertexShader = `
			// #define DEPTH_PACKING 3201
			
			uniform float uTime;
			uniform float uTimeFactor;
			
			attribute vec3 instanceOffset;
			attribute float instanceTimeOffset; 
			attribute float amplitude;
			attribute vec3 color;
			
		` + shader.vertexShader;
		
		shader.vertexShader = shader.vertexShader.replace(
			"#include <project_vertex>",`
			
			vec3 vPosition = transformed + instanceOffset;
			vPosition.y += (1.5+0.2*sin( uTime*uTimeFactor + instanceTimeOffset )) * amplitude;
		 
			vec4 mvPosition = modelViewMatrix * vec4( vPosition, 1.0 );
			
			gl_Position = projectionMatrix * modelViewMatrix * vec4( vPosition, 1.0 );`
		  );

		// shader.fragmentShader = "#define DEPTH_PACKING 3201" + "\n" + shader.fragmentShader;
			
		pillarDepthShader = shader;
	};
	// scene0.overrideMaterial = pillarsCustomDepthMat;
	
	gltfLoader.load( 'assets/models/pillars.glb' , function( gltf ){
		
		// 2x8x2
		let pillarGeo = gltf.scene.children[0].geometry;
		
		const instancesPerRow = 50, // 50
			instanceGrid = new THREE.Vector2( instancesPerRow , instancesPerRow ),
			gridSize = new THREE.Vector2( 2.0 , 2.0 ),
			extra = 0.1; // 4
		let x , y , z, w;
		let offsetArr = [],
			timeOffsetArr = [],
			amplitudeArr = [];
		for( let i = 0; i < instanceGrid.x; i++ ){
			for( let j = 0; j < instanceGrid.y; j++ ){
				x = i * gridSize.x - instanceGrid.x * gridSize.x / 2; // -50 : 50
				// y = Math.random() * variationHeight - Math.random() * variationHeight*0.5;
				y = 0.0;
				z = j * gridSize.y - instanceGrid.y * gridSize.y / 2;
				offsetArr.push( x , y , z );
				
				w = (instancesPerRow*0.5 + 0.5*x) / instancesPerRow * 10; // 0.0 : 1.0
				timeOffsetArr.push( w );
				
				// x = Math.random() * 6.28;
				w = Math.abs( perlin.noise( 
					x / 50 , 
					0.0,
					z / 50
				) ) * 2.0;
				amplitudeArr.push( (w+extra)* 20.0  );
			}
		}
		
		let instancedGeo = new THREE.InstancedBufferGeometry();
		instancedGeo.copy( pillarGeo );
		instancedGeo.maxInstancedCount = instancesPerRow * instancesPerRow;
		
		instancedGeo.addAttribute( 'instanceOffset' , 
			new THREE.InstancedBufferAttribute( new Float32Array( offsetArr ) , 3 ) 
		);
		instancedGeo.addAttribute( 'instanceTimeOffset' , 
			new THREE.InstancedBufferAttribute( new Float32Array( timeOffsetArr ) , 1 ) 
		);
		instancedGeo.addAttribute( 'amplitude' , 
			new THREE.InstancedBufferAttribute( new Float32Array( amplitudeArr ) , 1 ) 
		);
		
		// HACKED MATERIAL
		const col = 0.4;
		pillarMat2 = new THREE.MeshPhongMaterial({ 
			color: new THREE.Color( col , col , col ),
			shininess: 70,
		});
		pillarMat2.userData.uniforms = {
			uTime: { value: time },
			uTimeFactor: { value: timeFactor },
		};
		
		pillarMat2.onBeforeCompile = function( s ){
			
			// UNIFORMS
			s.uniforms.uTime = pillarMat2.userData.uniforms.uTime;
			s.uniforms.uTimeFactor = pillarMat2.userData.uniforms.uTimeFactor;
			
			// VERTEX
			s.vertexShader = `
				uniform float uTime;
				uniform float uTimeFactor;
				
				attribute vec3 instanceOffset;
				attribute float instanceTimeOffset; 
				attribute float amplitude;
				attribute vec3 color;
				
				varying vec3 vColor;
			` + s.vertexShader;
			
			s.vertexShader = s.vertexShader.replace( `#include <begin_vertex>` , `
				vColor = color;
				vec3 transformed = position + instanceOffset;
				transformed.y += (1.5+0.2*sin( uTime*uTimeFactor + instanceTimeOffset )) * amplitude;
			` );
			
			// FRAGMENT
			s.fragmentShader = `
				
				varying vec3 vColor;
			` + s.fragmentShader;
			
			s.fragmentShader = s.fragmentShader.replace( `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`, `
				if( vColor.b < 0.9 ) outgoingLight = vColor;
				gl_FragColor = vec4( outgoingLight, diffuseColor.a );
			` );
			
			pillarShader = s;
			// console.log( "pillarShader" , pillarShader );
		}
		
		pillars = new THREE.Mesh( instancedGeo , pillarMat2 );
		
		
		// SHADOWS
		pillars.customDepthMaterial = pillarsCustomDepthMat;
		
		if( shadows ){
			pillars.castShadow = true;
			pillars.receiveShadow = true;
			renderer.shadowMap.needsUpdate = true;
		}
		
		pillars.frustumCulled = false;
		
		scene0.add( pillars );
		// console.log( pillars );
		
	} );
}

let initControls = function(){
	// controls = new THREE.OrbitControls( camera0 , canvas );
	
	window.addEventListener( 'keydown', function(evt){
		if( evt.key === "l" ){
			console.log( camera0.position );
		}
	}, false );
}

let initTextures = function(){
	
}

let initPostProcessing = function(){
	composer = new THREE.EffectComposer( renderer );
	renderer.info.autoReset = false;
	
	// Passes
	renderPass = new THREE.RenderPass( scene0, camera0 );
	fxaaPass = new THREE.ShaderPass( THREE.FXAAShader );
	
	// resolution, strength, radius, threshold
	unrealBloomPass = new THREE.UnrealBloomPass( 
		new THREE.Vector2( 256 , 256 ),
		1.5, 0.0 , 0.35
	);
	// unrealBloomPass.enabled = false;
	unrealBloomPass.exposure = 1.0;
	
	let bloomPassFolder = gui.addFolder( "Bloom Pass" );
	// bloomPassFolder.open();
	bloomPassFolder.add( unrealBloomPass, 'exposure', 0.0, 2.0 , 0.1 )
	.onChange( function ( value ) {
		renderer.toneMappingExposure = Math.pow( value, 4.0 );
		// renderer.toneMappingExposure = value;
	} );
	bloomPassFolder.add( unrealBloomPass , 'strength' , 0.0 , 10.0 , 0.005 );
	bloomPassFolder.add( unrealBloomPass , 'radius' , 0.0 , 1.0 , 0.001 );
	bloomPassFolder.add( unrealBloomPass , 'threshold' , 0.0 , 1.0 , 0.001 );
	bloomPassFolder.add( unrealBloomPass , 'enabled' );
	
	// CUSTOM DEPTH MATERIAL FOR BOKEH
	let customDepthMaterial = new THREE.MeshDepthMaterial();
	customDepthMaterial.depthPacking = THREE.RGBADepthPacking;
	customDepthMaterial.blending = THREE.NoBlending;
	
	
	let multiplier = 0.0001;
	bokehPass = new THREE.BokehPass( scene0, camera0, {
		focus: 74.0, // 80.0
		aperture: 40.0 * multiplier, // 20.0 * multiplier
		maxblur: 1.0,
		width: window.innerWidth,
		height: window.innerHeight
	}, pillarsCustomDepthMat );
	bokehPass.controlAperture = 40;
	// bokehPass.enabled = false;
	
	let bokehPassFolder = gui.addFolder( "Bokeh Pass" );
	bokehPassFolder.open();
	bokehPassFolder.add( bokehPass.uniforms.focus, "value", 1.0, 500.0, 0.1 ).name("focus");
	bokehPassFolder.add( bokehPass, "controlAperture", 0.0, 200.0, 0.01 ).name("aperture").onChange( function(val){
		bokehPass.uniforms.aperture.value = val * multiplier;
	});
	bokehPassFolder.add( bokehPass.uniforms.maxblur, "value", 0.0, 3.0, 0.025 ).name("maxblur");
	bokehPassFolder.add( bokehPass , 'enabled' );
	console.log( bokehPass );
	
	composer.addPass( renderPass );
	composer.addPass( unrealBloomPass );
	composer.addPass( bokehPass );
}

let initLights = function(){
	Lights[0] = new THREE.AmbientLight( 0xffffff , 0.3 );
	Lights[1] = new THREE.DirectionalLight( 0xffffff , 1.5 );
	Lights[1].position.copy( lightPos );
	if(shadows){
		Lights[1].castShadow = true;
		Lights[1].shadow.mapSize.width = 512 * 1;
		Lights[1].shadow.mapSize.height = 512 * 1;
		Lights[1].shadow.camera.near = 0.1;
		Lights[1].shadow.camera.far = 100;
		// Lights[1].shadow.radius = 8;
		const dist = 30; // 30
		if( Lights[1] instanceof THREE.DirectionalLight ){
			Lights[1].shadow.camera.left = -dist;
			Lights[1].shadow.camera.bottom = -dist;
			Lights[1].shadow.camera.top = dist;
			Lights[1].shadow.camera.right = dist;
		}
		Lights[1].shadow.bias = 0.0005;
		
		let shadowFolder = gui.addFolder( "Shadows" );
		shadowFolder.open();
		// shadowFolder.add( Lights[1].shadow , "radius" ).min(0.1).max(10.0).step(0.05);
		shadowFolder.add( Lights[1].shadow.mapSize , "width" ).min(256).max(4096).step(256);
		shadowFolder.add( Lights[1].shadow.mapSize , "height" ).min(256).max(4096).step(256);
		const s = {
			range: 80.0,
			dist: 10,
		};
		shadowFolder.add( Lights[1].position , "x" ).min(-s.range).max(s.range).step(0.1);
		shadowFolder.add( Lights[1].position , "y" ).min(-s.range).max(s.range).step(0.1);
		shadowFolder.add( Lights[1].position , "z" ).min(-s.range).max(s.range).step(0.1);
		
		let helper = new THREE.CameraHelper( Lights[1].shadow.camera );
		scene0.add( helper );
	}
	
	for(let i = 0; i < Lights.length; i++){
		scene0.add( Lights[i] );
	}
}

function animate() {
	// stats.begin();
	renderer.info.reset();
	let delta = clock.getDelta();
	time += 1/60;
	
	if( pillarShader.uniforms ) pillarShader.uniforms.uTime.value = time;
	if( pillarDepthShader.uniforms ) pillarDepthShader.uniforms.uTime.value = time;
	
	if( shadows ) renderer.shadowMap.needsUpdate = true;
	
	requestAnimationFrame( animate );
	composer.render( scene0, camera0 );
	stats.update();
}

init();
requestAnimationFrame( animate );
