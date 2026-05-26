/**
 * Finds the best path from a start node to a goal node using the A* algorithm.
 * @param {string} startKey - The key of the starting node.
 * @param {string} goalKey - The key of the goal node.
 * @param {Map<string, NodeAStar>} gridRaw - A map representing the grid of nodes.
 * @returns {Array<string>} An array of node keys representing the shortest path.
 */
export default function findBestPath(startKey, goalKey, gridRaw) {
  const grid = new Map();
  for (const entries of gridRaw.entries()) {
    grid.set(entries[0], entries[1].copy());
  }

  let open = [];
  const close = [];

  const start = grid.get(startKey);
  const goal = grid.get(goalKey);
  let find = false;

  findCost(start, goal);
  open.push(start);

  let current = start;

  do {
    current = findLowestCost(open);
    open = open.filter((node) => node.key !== current.key);
    close.push(current);

    if (current.key === goalKey) {
      find = true;
    } else {
      for (let neighbour of current.neighbours) {
        neighbour = grid.get(neighbour.key);
        if (!close.find((closedNode) => closedNode === neighbour)) {
          if (!open.find((openedNode) => openedNode === neighbour)) {
            neighbour.parent = current;
            findCost(neighbour, goal);
            open.push(neighbour);
          } else {
            const neighbourCopy = neighbour.copy(current);
            const newCost = findCost(neighbourCopy, goal);

            if (newCost.f < neighbour.cost.f) {
              neighbour.parent = current;
              neighbour.cost = newCost;
            }
          }
        }
      }
    }
  } while (!find);

  return findPath(current);
}

/**
 * Finds the node with the lowest f-cost in the open list.
 * @param {Array<NodeAStar>} open - The array of open nodes.
 * @returns {NodeAStar} The node with the lowest cost.
 * @throws {Error} If the open list is empty.
 */
function findLowestCost(open) {
  if (open.length <= 0) {
    throw new Error("Open is empty !");
  }

  let lowestCost = open[0];

  for (let i = 1; i < open.length; i++) {
    if (open[i].cost.f < lowestCost.cost.f) {
      lowestCost = open[i];
    }
  }

  return lowestCost;
}

/**
 * Recursively reconstructs the path from the goal node back to the start node.
 * @param {NodeAStar} current - The current node.
 * @param {Array<string>} [path=[]] - The accumulated path.
 * @returns {Array<string>} The reconstructed path of node keys.
 */
function findPath(current, path = []) {
  if (!current) {
    return path.reverse();
  }

  path.push(current.key);
  return findPath(current.parent, path);
}

/**
 * Calculates and updates the pathfinding cost (g, h, f) of a node.
 * @param {NodeAStar} node - The node to calculate the cost for.
 * @param {NodeAStar} goalNode - The goal node to compute the heuristic against.
 * @returns {Object} The calculated cost object {g, h, f}.
 */
function findCost(node, goalNode) {
  if (node.parent) {
    node.cost.g = node.parent.cost.g + 1;
  } else {
    node.cost.g = 0;
  }

  node.cost.h = Math.sqrt(
    (goalNode.x - node.x) ** 2 + (goalNode.y - node.y) ** 2,
  );

  node.cost.f = node.cost.g + node.cost.h;

  return node.cost;
}
