import { AnimationGroup, Color3, Mesh, PhysicsImpostor, Scene, SceneLoader, StandardMaterial, Vector3 } from "@babylonjs/core";
import { PickableCrate } from "./objects/pickableCrate";

export class Environment {
    private _scene: Scene;

    constructor(scene: Scene) {
        this._scene = scene;
    }

    public async load() {
        var ground = Mesh.CreateBox("ground", 0.2, this._scene);
        ground.scaling = new Vector3(500,.1,500);
        ground.checkCollisions = true;
        ground.physicsImpostor = new PhysicsImpostor(ground, PhysicsImpostor.PlaneImpostor, { mass: 0, restitution: 0.9 }, this._scene);
        const assets = await this._loadAssets();
        //Loop through all environment meshes that were imported
        assets.allMeshes.forEach((m) => {
            if (m.name.startsWith("crate")){
                let crate = new PickableCrate(this._scene, m.getAbsolutePosition());
                crate.load();
                m.isVisible = false;
                m.setEnabled(false);
            } else {
                m.receiveShadows = true;
                m.checkCollisions = true;
                m.physicsImpostor =  new PhysicsImpostor(m, PhysicsImpostor.BoxImpostor, { mass: 0, restitution: 0.1 }, this._scene);
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