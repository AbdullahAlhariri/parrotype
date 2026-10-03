import { q, type Quote } from './types'

// English: public-domain quotes with attribution. Items 1-34 were checked word for word
// against Project Gutenberg texts (docs/research/exercises-and-content.md section 13.2).
// Dashes in the originals are replaced by commas so every character is on the keyboard.

export const EN_QUOTES: Quote[] = [
  q("All the world's a stage, and all the men and women merely players.", 'William Shakespeare, As You Like It (c. 1599)'),
  q('To be, or not to be, that is the question.', 'William Shakespeare, Hamlet (c. 1600)', { note: 'punctuation varies between editions' }),
  q('The course of true love never did run smooth.', "William Shakespeare, A Midsummer Night's Dream (c. 1595)"),
  q('Brevity is the soul of wit.', 'William Shakespeare, Hamlet (c. 1600)'),
  q('There is nothing either good or bad but thinking makes it so.', 'William Shakespeare, Hamlet (c. 1600)'),
  q('This above all: to thine own self be true.', 'William Shakespeare, Hamlet (c. 1600)'),
  q("Shall I compare thee to a summer's day?", 'William Shakespeare, Sonnet 18 (1609)'),
  q('If music be the food of love, play on.', 'William Shakespeare, Twelfth Night (c. 1601)'),
  q('Some are born great, some achieve greatness, and some have greatness thrust upon them.', 'William Shakespeare, Twelfth Night (c. 1601)'),
  q('The fault, dear Brutus, is not in our stars, but in ourselves.', 'William Shakespeare, Julius Caesar (c. 1599)'),
  q("What's in a name? That which we call a rose by any other name would smell as sweet.", 'William Shakespeare, Romeo and Juliet (c. 1595)'),
  q('We are such stuff as dreams are made on.', 'William Shakespeare, The Tempest (c. 1611)', { note: "'on', not 'of'" }),
  q('Parting is such sweet sorrow.', 'William Shakespeare, Romeo and Juliet (c. 1595)'),
  q("Life's but a walking shadow, a poor player, that struts and frets his hour upon the stage, and then is heard no more.", 'William Shakespeare, Macbeth (c. 1606)', {
    note: 'line breaks removed',
  }),
  q('It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', 'Jane Austen, Pride and Prejudice (1813)'),
  q('One half of the world cannot understand the pleasures of the other.', 'Jane Austen, Emma (1815)'),
  q('It was the best of times, it was the worst of times.', 'Charles Dickens, A Tale of Two Cities (1859)'),
  q('It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.', 'Charles Dickens, A Tale of Two Cities (1859)', {
    note: 'the sentence goes on; it ends here with a full stop',
  }),
  q('Heaven knows we need never be ashamed of our tears.', 'Charles Dickens, Great Expectations (1861)'),
  q('Reader, I married him.', 'Charlotte Brontë, Jane Eyre (1847)'),
  q('I am no bird; and no net ensnares me.', 'Charlotte Brontë, Jane Eyre (1847)'),
  q('Curiouser and curiouser!', "Lewis Carroll, Alice's Adventures in Wonderland (1865)"),
  q('Begin at the beginning, and go on till you come to the end: then stop.', "Lewis Carroll, Alice's Adventures in Wonderland (1865)"),
  q("Why, sometimes I've believed as many as six impossible things before breakfast.", 'Lewis Carroll, Through the Looking-Glass (1871)'),
  q('It takes all the running you can do, to keep in the same place.', 'Lewis Carroll, Through the Looking-Glass (1871)'),
  q("'Twas brillig, and the slithy toves did gyre and gimble in the wabe: all mimsy were the borogoves, and the mome raths outgrabe.", 'Lewis Carroll, Jabberwocky (1871)', {
    note: 'line breaks removed',
  }),
  q('We are all in the gutter, but some of us are looking at the stars.', "Oscar Wilde, Lady Windermere's Fan (1892)"),
  q('I can resist everything except temptation.', "Oscar Wilde, Lady Windermere's Fan (1892)"),
  q('The truth is rarely pure and never simple.', 'Oscar Wilde, The Importance of Being Earnest (1895)'),
  q('The only way to get rid of a temptation is to yield to it.', 'Oscar Wilde, The Picture of Dorian Gray (1890)'),
  q('Happy families are all alike; every unhappy family is unhappy in its own way.', 'Leo Tolstoy, Anna Karenina (1878), trans. Constance Garnett'),
  q('Hope is the thing with feathers that perches in the soul.', 'Emily Dickinson, Poems, Second Series (1891)', { note: 'line break removed' }),
  q('Because I could not stop for Death, he kindly stopped for me.', 'Emily Dickinson, Poems (1890)', { note: 'dashes and line break removed' }),
  q('Do I contradict myself? Very well then I contradict myself, (I am large, I contain multitudes.)', 'Walt Whitman, Song of Myself (1855/1892)'),
  q('The only way to have a friend is to be one.', 'Ralph Waldo Emerson, Friendship (1841)'),
  q('Well done is better than well said.', "Benjamin Franklin, Poor Richard's Almanack (1737)"),
  q('Early to bed and early to rise, makes a man healthy, wealthy and wise.', "Benjamin Franklin, Poor Richard's Almanack (1735)"),
  q('Laugh, and the world laughs with you; weep, and you weep alone.', 'Ella Wheeler Wilcox, Solitude (1883)'),
  q("I'm not afraid of storms, for I'm learning how to sail my ship.", 'Louisa May Alcott, Little Women (1868)'),
  q('There is no place like home.', 'L. Frank Baum, The Wonderful Wizard of Oz (1900)'),
  q('Work consists of whatever a body is obliged to do, and Play consists of whatever a body is not obliged to do.', 'Mark Twain, The Adventures of Tom Sawyer (1876)'),
  q('Pieces of eight! pieces of eight! pieces of eight!', 'Robert Louis Stevenson, Treasure Island (1883), the parrot'),
  q('Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore', 'Edgar Allan Poe, The Raven (1845)', {
    note: 'line breaks removed',
  }),
  q('Quoth the Raven "Nevermore."', 'Edgar Allan Poe, The Raven (1845)'),
  q('A thing of beauty is a joy for ever.', 'John Keats, Endymion (1818)'),
  q('Beauty is truth, truth beauty, that is all ye know on earth, and all ye need to know.', 'John Keats, Ode on a Grecian Urn (1819)', {
    note: 'quotation marks, dash and line break removed',
  }),
  q('Beware; for I am fearless, and therefore powerful.', 'Mary Shelley, Frankenstein (1818)'),
  q('Believe me, my young friend, there is nothing, absolutely nothing, half so much worth doing as simply messing about in boats.', 'Kenneth Grahame, The Wind in the Willows (1908)'),
  q('When a man is tired of London, he is tired of life; for there is in London all that life can afford.', "Samuel Johnson, in Boswell's Life of Johnson (1791)"),
  q('Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.', 'Abraham Lincoln, Gettysburg Address (1863)'),
  q('We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.', 'Declaration of Independence (1776)'),
  q('I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.', 'Henry David Thoreau, Walden (1854)'),
  q('Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.', 'Herman Melville, Moby-Dick (1851)', {
    note: 'dashes replaced by commas',
  }),
  q('All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.', 'Universal Declaration of Human Rights, article 1 (1948)'),
]
