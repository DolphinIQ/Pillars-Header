
let instanceShader = {
	uniforms: {
		uTime: { value: 0.0 },
		uDiffuse: { value: new THREE.Color( 1 , 1 , 1 ) },
		uDirLightPos: { value: new THREE.Vector3() },
		uDirLightCol: { value: new THREE.Color() },
		uDirLightIntensity: { value: 0.0 },
		uAmbientLightIntensity: { value: 0.0 },
		uAmbientLightCol: { value: new THREE.Color() },
	},
	
	vertexShader: `
		precision highp float;
		
		uniform float uTime;
		uniform vec3 uDiffuse;
		uniform vec3 uDirLightPos;
		uniform vec3 uDirLightCol;
		uniform float uDirLightIntensity;
		uniform float uAmbientLightIntensity;
		uniform vec3 uAmbientLightCol;
		
		attribute vec3 instanceOffset;
		attribute float instanceTimeOffset;
		
		varying vec3 vColor;
		varying vec3 vNormal;
		varying vec3 vViewPosition;
		varying vec3 vLambert;
		
		void main(){
			vColor = color;
			vNormal = normal;
			
			vec3 transformed = position + vec3(instanceOffset.x, instanceOffset.y*1.0, instanceOffset.z);
			transformed.y += sin( uTime + instanceTimeOffset );
			
			vec3 emission = vColor;
			if( emission.b > 0.9 ) emission = vec3( 0.0 );
			
			float uvFactor = (1.0 - uv.y) * 0.1;
			
			vec3 lightVector = normalize( uDirLightPos );
			float fac = max( dot( vNormal , lightVector ) , 0.0 );
			vLambert = 
				uDiffuse * uDirLightCol * uDirLightIntensity * fac + 
				uDiffuse * uAmbientLightCol * uAmbientLightIntensity; //+ 
				//vec3( uvFactor );
			
			if( emission.r > vLambert.r ) vLambert = emission + vec3( 0.1 );
			
			gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
		}
	`,
	
	fragmentShader: `
		precision highp float;
		
		uniform vec3 uDiffuse;
		
		varying vec3 vColor;
		varying vec3 vNormal;
		varying vec3 vLambert;
		
		void main() {
			vec3 emission = vColor;
			
			gl_FragColor = vec4( vLambert, 1.0 );
		}
	`
}

