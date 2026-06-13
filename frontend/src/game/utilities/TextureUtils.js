import * as THREE from 'three';

export function applyTriplanarMapping(material, scale = 0.05) {
    material.onBeforeCompile = (shader) => {
        shader.vertexShader = `
            varying vec3 vLocalPos;
            varying vec3 vLocalNorm;
            ${shader.vertexShader}
        `.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vLocalPos = position;
            vLocalNorm = normal;
            `
        );

        shader.fragmentShader = `
            varying vec3 vLocalPos;
            varying vec3 vLocalNorm;
            #ifndef USE_NORMALMAP_OBJECTSPACE
                uniform mat3 normalMatrix;
            #endif
            ${shader.fragmentShader}
        `.replace(
            '#include <map_fragment>',
            `
            #ifdef USE_MAP
                vec3 blend = abs(vLocalNorm);
                blend = normalize(max(blend, 0.00001));
                float b = blend.x + blend.y + blend.z;
                blend /= b;
                
                float texScale = ${scale};
                vec4 tx = texture2D(map, vLocalPos.yz * texScale);
                vec4 ty = texture2D(map, vLocalPos.xz * texScale);
                vec4 tz = texture2D(map, vLocalPos.xy * texScale);
                
                vec4 texColor = tx * blend.x + ty * blend.y + tz * blend.z;
                diffuseColor *= texColor;
            #endif
            `
        ).replace(
            '#include <normal_fragment_maps>',
            `
            #ifdef USE_NORMALMAP
                vec3 localNormal = normalize(vLocalNorm);
                vec3 blendNorm = abs(localNormal);
                blendNorm = normalize(max(blendNorm, 0.00001));
                float bNorm = blendNorm.x + blendNorm.y + blendNorm.z;
                blendNorm /= bNorm;

                float texScaleNorm = ${scale};
                
                vec3 tNx = texture2D(normalMap, vLocalPos.yz * texScaleNorm).xyz * 2.0 - 1.0;
                vec3 tNy = texture2D(normalMap, vLocalPos.xz * texScaleNorm).xyz * 2.0 - 1.0;
                vec3 tNz = texture2D(normalMap, vLocalPos.xy * texScaleNorm).xyz * 2.0 - 1.0;

                tNx.xy *= normalScale;
                tNy.xy *= normalScale;
                tNz.xy *= normalScale;

                vec3 wNx = vec3(tNx.z * sign(localNormal.x), tNx.y, tNx.x * sign(localNormal.x));
                vec3 wNy = vec3(tNy.x, tNy.z * sign(localNormal.y), tNy.y * sign(localNormal.y));
                vec3 wNz = vec3(tNz.x, tNz.y, tNz.z * sign(localNormal.z));

                vec3 blendedNormal = normalize(wNx * blendNorm.x + wNy * blendNorm.y + wNz * blendNorm.z);
                
                #ifdef DOUBLE_SIDED
                    blendedNormal *= faceDirection;
                #endif

                normal = normalize(normalMatrix * blendedNormal);
            #endif
            `
        );
    };
}
