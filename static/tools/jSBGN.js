
newNode = function() {
		return { id: '', data: {}, edges: [] };
		}

newEdge = function() {
		return { id: '', source: '', target: '', sourceNode: null, targetNode: null };
		}

jSBGN = {
	nodes:	[],
	edges:	[],

	appendNode: function(Node) {
			this.nodes.push(Node);
			},

	removeNode: function(Node) {
			for (index in this.nodes) {
				node = this.nodes[index];
				if (node == Node) {
					this.nodes.drop(index);		// requires array.js
					break;
					}
				}
			},

	getNodeById: function(id) {
			for (index in this.nodes) {
				node = this.nodes[index];
				if (node.id == id)
					return node;
				}
			return null;
			},

	hasNode: function(id) {
			return this.getNodeById(id) != null;
			}
	}
