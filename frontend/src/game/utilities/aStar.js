/**
@param {Map} gridRaw = Map {
    key -> NodeAstar,
    ...
}
@param {String} startKey
@param {String} goalKey
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
    open = open.filter((node) => node.key !== current.key); //? remove current from open
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
 *
 * @param {Array} open
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
 *
 * @param {NodeAStar} current
 * @param {Array} path = [String, ...]
 */
function findPath(current, path = []) {
  if (!current) {
    return path.reverse();
  }

  path.push(current.key);
  return findPath(current.parent, path);
}

/**
 *
 * @param {NodeAStar} node
 * @param {NodeAStar} goalNode
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
