import { AnimationGroup, Color3, Mesh, Scene, SceneLoader, StandardMaterial, Vector3 } from "@babylonjs/core";
import { PickableCrate } from "./objects/pickableCrate";

export class Environment {
    private _scene: Scene;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public async load() {
        /*
        var ground = Mesh.CreateBox("ground", 0.2, this._scene);
        ground.scaling = new Vector3(500,.1,500);
        ground.checkCollisions = true;
        var box = Mesh.CreateBox("nice", 2);
        const material = new StandardMaterial('test', this._scene)
        material.alpha = 1
        material.diffuseColor = new Color3(0.2, 0.2, 0.7)
        box.material = material
        box.position = new Vector3(5, 1, 5);
        box.checkCollisions = true;
        */
        const assets = await this._loadAssets();
        //Loop through all environment meshes that were imported
        assets.allMeshes.forEach((m) => {
            if (m.name.startsWith("crate")){
                m.isVisible = false;
                let crate = new PickableCrate(this._scene, m.position);
                crate.load();
            } else {
                m.receiveShadows = true;
                m.checkCollisions = true;
            }
        });
    }

    private async _loadAssets() {
        //loads game environment
        const result = await SceneLoader.ImportMeshAsync(null, "./models/", "startingRoom.glb", this._scene);

        let env = result.meshes[0];
        let allMeshes = env.getChildMeshes();
        return {
            env: env, //reference to our entire imported glb (meshes and transform nodes)
            allMeshes: allMeshes, // all of the meshes that are in the environment
        };
    }
}