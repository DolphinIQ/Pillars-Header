# Pillars-Header
https://peterstylinsky.com/projects/pillars/
This project is a potential website header with a (hopefully :) pretty & satisfying, animated 3D background. 

It was built with Three.js r106 and showcases features like:
- Instancing of a loaded model
- Modifying built in materials to support shadows for instances
- Applying multiple post-processing passes (bloom + bokeh)
- Using noise functions to generate the starting positions and wave animation values
- Passing custom attributes and coding a wave animation in the shader
- Animated fully through the GPU! The only uniform being sent is the updated time value
- CSS Keyframe Animations & responsiveness

Different visual effects can be achieved by playing with the shader uniforms provided in the top-right controller. 
I encourage you to try out some ideas!
The one with bokeh focus set to 1 is my personal favorite :)
