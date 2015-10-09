/**
 * Represents a book.
 * @constructor
 * @param {string} title - The title of the book.
 * @param {string} author - The author of the book.
 */
function Book(title, author) {
  this.title = title
  this.author = author
}


/**
 * Rent a book
 * @param {number} id - Id of the user
 */
Book.prototype.rent = function(id) {
  return true
}

var hp = new Book()

hp.