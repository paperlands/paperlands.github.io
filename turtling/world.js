 // First, let's create a TurtleSystem class to manage multiple turtles
class World {
    static running = null;

    constructor(canvas) {

        if (World.running) {
            return World.running;
        }

        this.canvas = canvas;
        this.turtles = new Map();
        this.relationships = new Map();
        this.time = 0;
    }

    // Create a new turtle with a given ID
    spawn(id) {
        const turtle = new Turtle(this.canvas);
        turtle.id = id;
        // Add system-level positioning
        turtle.worldX = turtle.x;
        turtle.worldY = turtle.y;
        turtle.worldZ = turtle.z;
        this.turtles.set(id, turtle);
        return turtle;
    }

    // Define a relationship between turtles
    relate(followerId, leaderId, relationship) {
        this.relationships.set(followerId, {
            leader: leaderId,
            relation: relationship
        });
    }

    // Update positions based on relationships
    update(dt) {
        this.time += dt;
        for (const [followerId, relation] of this.relationships) {
            const follower = this.turtles.get(followerId);
            const leader = this.turtles.get(relation.leader);
            if (follower && leader) {
                relation.relation(follower, leader, this.time);
            }
        }
    }

    // Clear all turtles and relationships
    reset() {
        this.turtles.clear();
        this.relationships.clear();
        this.time = 0;
    }
}
