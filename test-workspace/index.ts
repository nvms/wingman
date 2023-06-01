class BinarySearchTreeNode<T> {
  constructor(public value: T) { }

  left: BinarySearchTreeNode<T> | null = null;
  right: BinarySearchTreeNode<T> | null = null;

  insert(value: T): void {
    if (value <= this.value) {
      if (!this.left) {
        this.left = new BinarySearchTreeNode(value);
      } else {
        this.left.insert(value);
      }
    } else if (!this.right) {
      this.right = new BinarySearchTreeNode(value);
    } else {
      this.right.insert(value);
    }
  }

  find(value: T): BinarySearchTreeNode<T> | null {
    if (value === this.value) {
      return this;
    } else if (value < this.value && this.left !== null) {
      return this.left.find(value);
    } else if (value > this.value && this.right !== null) {
      return this.right.find(value);
    } else {
      return null;
    }
  }
}

class BinarySearchTree<T> {
  root: BinarySearchTreeNode<T> | null = null;
  insert(value: T): void {
    if (!this.root) {
      this.root = new BinarySearchTreeNode(value);
      return;
    }
    this.root.insert(value);
  }

  find(value: T): BinarySearchTreeNode<T> | null {
    if (!this.root) return null;
    return this.root.find(value);
  }
}

// A vue 3 (composition API) counter component.
<script lang="ts" setup>