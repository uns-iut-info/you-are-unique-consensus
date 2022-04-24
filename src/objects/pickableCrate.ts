import { Mesh, PhysicsImpostor, Scene, SceneLoader, Vector3 } from "@babylonjs/core";

export class PickableCrate{

    private _scene: Scene;
    private _startingPosition: Vector3;

    constructor(scene, startingPosition){
        this._scene = scene;
        this._startingPosition = startingPosition;
    }

    public async load() {
        let crateRoot = await (await SceneLoader.ImportMeshAsync(null, "./models/", "wooden crate.glb", this._scene));
        let crateModel;
        let crateHitbox;
        crateRoot.meshes.forEach((m) => {
            if (m.name == "hitbox"){
                crateHitbox = m;
            } else {
                crateModel = m;
            }
        })
        crateModel.receiveShadows = true;
        
        crateModel.isVisible = true;
        crateHitbox.isVisible = false;
        
        crateModel.isPickable = false;
        crateHitbox.isPickable = true;
        
        crateModel.checkCollisions = false;
        crateHitbox.checkCollisions = true;
        
        crateHitbox.physicsImpostor =  new PhysicsImpostor(crateHitbox, PhysicsImpostor.BoxImpostor, { mass: 1, restitution: 0, friction: 0.5 }, this._scene);
        crateModel.setParent(crateHitbox);
        crateHitbox.setAbsolutePosition(this._startingPosition);
    }

}