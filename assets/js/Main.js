/* 
THREE.js r106 
*/

// Global Variables
let canvas = document.getElementById("myCanvas");
let camera, scene, renderer, composer, clock, time=0.0, stats, gui;
let controls, 
	camPos = new THREE.Vector3( 25 , 17 , -18 ),
	mousePos = new THREE.Vector2( 0.5 , 0.5 );
let textureLoader, gltfLoader;
let Lights = [];
let bokehPass, unrealBloomPass, renderPass;
let pillars , pillarsCustomDepthMat , pillarShader = {} , pillarDepthShader = {};
let perlin;

const lightPos = new THREE.Vector3( -20 , 20 , 20 );

function init() {
	// Renderer
	renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true, powerPreference: "high-performance" } );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.physicallyCorrectLights = true;
	
	// Scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0x000000 );
	
	// Camera
	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1.0, 100 );
	camera.position.copy( camPos );
	camera.lookAt( new THREE.Vector3( -5 , 0 , -2 ) );
	
	// Clock
	clock = new THREE.Clock();
	
	//Stats & GUI
	stats = new Stats();
	document.body.appendChild( stats.dom );
	gui = new dat.GUI();
	
	// Noise
	perlin = new THREE.ImprovedNoise();
	
	// Loaders
	textureLoader = new THREE.TextureLoader();
	gltfLoader = new THREE.GLTFLoader();

	// Resize Event
	window.addEventListener("resize", function(){
		renderer.setSize( window.innerWidth, window.innerHeight );
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	}, false);
	
	// Inits
	initLights();
	createStartingMesh();
	initPostProcessing();
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
	
	gltfLoader.load( 'assets/models/pillars.glb' , function( gltf ){
		
		// 2x8x2
		let pillarGeo = gltf.scene.children[0].geometry;
		
		const instancesPerRow = 40, // 50
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
				y = 0.0;
				z = j * gridSize.y - instanceGrid.y * gridSize.y / 2;
				offsetArr.push( x , y , z );
				
				w = (instancesPerRow*0.5 + 0.5*x) / instancesPerRow * 10; // 0.0 : 1.0
				timeOffsetArr.push( w );
				
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
		}
		
		pillars = new THREE.Mesh( instancedGeo , pillarMat2 );
		
		pillars.customDepthMaterial = pillarsCustomDepthMat;
		
		pillars.frustumCulled = false;
		scene.add( pillars );
	} );
}

let initPostProcessing = function(){
	
	composer = new THREE.EffectComposer( renderer );
	renderer.info.autoReset = false;
	
	// Passes
	renderPass = new THREE.RenderPass( scene, camera );
	
	unrealBloomPass = new THREE.UnrealBloomPass( 
		new THREE.Vector2( 256 , 256 ), // resolution
		1.5, 0.0 , 0.35 // strength, radius, threshold
	);
	unrealBloomPass.exposure = 1.0;
	Controller.addBloomControls( unrealBloomPass , false );
	
	let multiplier = 0.0001;
	bokehPass = new THREE.BokehPass( scene, camera, {
		focus: 74.0, // 74.0
		aperture: 70.0 * multiplier, // 20.0 * multiplier
		maxblur: 1.0,
		width: window.innerWidth,
		height: window.innerHeight
	}, pillarsCustomDepthMat );
	Controller.addBokehControls( bokehPass , multiplier , false );
	
	composer.addPass( renderPass );
	composer.addPass( unrealBloomPass );
	composer.addPass( bokehPass );
}

let initLights = function(){
	Lights[0] = new THREE.AmbientLight( 0xffffff , 0.3 );
	Lights[1] = new THREE.DirectionalLight( 0xffffff , 1.5 );
	Lights[1].position.copy( lightPos );
	
	for(let i = 0; i < Lights.length; i++){
		scene.add( Lights[i] );
	}
}

let animate = function(){
	
	time += 1/60;
	
	if( pillarShader.uniforms ) pillarShader.uniforms.uTime.value = time;
	if( pillarDepthShader.uniforms ) pillarDepthShader.uniforms.uTime.value = time;
	
	requestAnimationFrame( animate );
	composer.render( scene, camera );
	stats.update();
}

init();
requestAnimationFrame( animate );
