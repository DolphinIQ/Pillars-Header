
let Controller = {
	
	addBloomControls: function( unrealBloomPass , open ){

		let bloomPassFolder = gui.addFolder( "Bloom Pass" );
		if( open ) bloomPassFolder.open();
		bloomPassFolder.add( unrealBloomPass, 'exposure', 0.0, 2.0 , 0.1 )
		.onChange( function ( value ) {
			renderer.toneMappingExposure = Math.pow( value, 4.0 );
		} );
		bloomPassFolder.add( unrealBloomPass , 'strength' , 0.0 , 10.0 , 0.005 );
		bloomPassFolder.add( unrealBloomPass , 'radius' , 0.0 , 1.0 , 0.001 );
		bloomPassFolder.add( unrealBloomPass , 'threshold' , 0.0 , 1.0 , 0.001 );
		bloomPassFolder.add( unrealBloomPass , 'enabled' );
	},
	
	addBokehControls: function( bokehPass , multiplier , open ){
		
		bokehPass.controlAperture = bokehPass.uniforms.aperture.value / multiplier;
		let bokehPassFolder = gui.addFolder( "Bokeh Pass" );
		if( open ) bokehPassFolder.open();
		bokehPassFolder.add( bokehPass.uniforms.focus, "value", 1.0, 500.0, 0.1 ).name("focus");
		bokehPassFolder.add( bokehPass, "controlAperture", 0.0, 200.0, 0.01 ).name("aperture").onChange( function(val){
			bokehPass.uniforms.aperture.value = val * multiplier;
		});
		bokehPassFolder.add( bokehPass.uniforms.maxblur, "value", 0.0, 3.0, 0.025 ).name("maxblur");
		bokehPassFolder.add( bokehPass , 'enabled' );
	}
	
};


