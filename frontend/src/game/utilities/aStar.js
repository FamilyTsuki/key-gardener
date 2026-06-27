/**
 * Finds the best path.
 * @param {any} startKey - The startKey.
 * @param {any} goalKey - The goalKey.
 * @param {string} gridRaw - The gridRaw.
 */
export default function findBestPath(startKey, goalKey, gridRaw) {
    if (startKey === goalKey) {
        return [startKey];
    }

    const startNode = gridRaw.get(startKey);
    const goalNode = gridRaw.get(goalKey);
    if (!startNode || !goalNode) {
        return [];
    }

    const openSet = new Set([startKey]);
    const closedSet = new Set();

    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();

    gScore.set(startKey, 0);
    const startH = Math.sqrt((goalNode.x - startNode.x) ** 2 + (goalNode.y - startNode.y) ** 2);
    fScore.set(startKey, startH);

    while (openSet.size > 0) {
        let currentKey = null;
        let lowestF = Infinity;
        for (const key of openSet) {
            const f = fScore.get(key) ?? Infinity;
            if (f < lowestF) {
                lowestF = f;
                currentKey = key;
            }
        }

        if (currentKey === goalKey) {
            const path = [];
            let curr = currentKey;
            while (curr !== undefined) {
                path.push(curr);
                curr = cameFrom.get(curr);
            }
            return path.reverse();
        }

        openSet.delete(currentKey);
        closedSet.add(currentKey);

        const currentNode = gridRaw.get(currentKey);
        if (!currentNode) continue;

        for (const neighbourNode of currentNode.neighbours) {
            const neighbourKey = neighbourNode.key;
            if (closedSet.has(neighbourKey)) {
                continue;
            }

            const dist = Math.sqrt(
                (neighbourNode.x - currentNode.x) ** 2 + (neighbourNode.y - currentNode.y) ** 2
            );
            const tentativeGScore = (gScore.get(currentKey) ?? Infinity) + dist;

            if (tentativeGScore < (gScore.get(neighbourKey) ?? Infinity)) {
                cameFrom.set(neighbourKey, currentKey);
                gScore.set(neighbourKey, tentativeGScore);
                
                const h = Math.sqrt(
                    (goalNode.x - neighbourNode.x) ** 2 + (goalNode.y - neighbourNode.y) ** 2
                );
                fScore.set(neighbourKey, tentativeGScore + h);

                openSet.add(neighbourKey);
            }
        }
    }

    return [];
}
