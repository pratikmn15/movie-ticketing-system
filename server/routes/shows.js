import express from 'express';
import { pool } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all shows
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, 
             m.title as movie_title, m.duration, m.genre, m.image_url,
             t.name as theater_name, t.location
      FROM shows s
      JOIN movie m ON s.movie_id = m.id
      JOIN theater t ON s.theater_id = t.id
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get shows for a specific theater
router.get('/theater/:theaterId', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, 
             m.title, m.duration, m.genre, m.image_url, m.description,
             t.name as theater_name, t.location
      FROM shows s
      JOIN movie m ON s.movie_id = m.id
      JOIN theater t ON s.theater_id = t.id
      WHERE s.theater_id = ?
      ORDER BY s.show_time ASC
    `, [req.params.theaterId]);
    
    const shows = rows.map(row => ({
      id: row.id,
      movie_id: row.movie_id,
      theater_id: row.theater_id,
      show_time: row.show_time,
      price: row.price,
      movie: {
        id: row.movie_id,
        title: row.title,
        duration: row.duration,
        genre: row.genre,
        description: row.description,
        image_url: row.image_url
      },
      theater: {
        id: row.theater_id,
        name: row.theater_name,
        location: row.location
      }
    }));
    
    res.json(shows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get show by ID
router.get('/:id', async (req, res) => {
  try {
    console.log(`Fetching show with ID: ${req.params.id}`); // Add logging

    const [rows] = await pool.query(`
      SELECT s.*, 
             m.id as movie_id, m.title, m.duration, m.genre, m.image_url, m.description,
             t.id as theater_id, t.name as theater_name, t.location
      FROM shows s
      JOIN movie m ON s.movie_id = m.id
      JOIN theater t ON s.theater_id = t.id
      WHERE s.id = ?
    `, [req.params.id]);

    if (rows.length === 0) {
      console.log('Show not found'); // Add logging
      return res.status(404).json({ message: 'Show not found' });
    }

    const show = {
      id: rows[0].id,
      show_time: rows[0].show_time,
      price: rows[0].price,
      movie: {
        id: rows[0].movie_id,
        title: rows[0].title,
        duration: rows[0].duration,
        genre: rows[0].genre,
        description: rows[0].description,
        image_url: rows[0].image_url
      },
      theater: {
        id: rows[0].theater_id,
        name: rows[0].theater_name,
        location: rows[0].location
      }
    };

    console.log('Show details:', show); // Add logging
    res.json(show);
  } catch (error) {
    console.error('Error getting show:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create show
router.post('/', async (req, res) => {
  const { movie_id, theater_id, show_time, price } = req.body;
  try {
    // Validate input
    if (!movie_id || !theater_id || !show_time || !price) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate movie and theater exist
    const [movie] = await pool.query('SELECT id FROM movie WHERE id = ?', [movie_id]);
    const [theater] = await pool.query('SELECT id FROM theater WHERE id = ?', [theater_id]);

    if (movie.length === 0) return res.status(404).json({ error: 'Movie not found' });
    if (theater.length === 0) return res.status(404).json({ error: 'Theater not found' });

    // Insert show
    const [result] = await pool.query(
      'INSERT INTO shows (movie_id, theater_id, show_time, price) VALUES (?, ?, ?, ?)',
      [movie_id, theater_id, show_time, price]
    );

    // Get complete show details
    const [shows] = await pool.query(`
      SELECT s.*, m.title, m.duration, m.genre, m.image_url,
             t.name as theater_name, t.location 
      FROM shows s
      JOIN movie m ON s.movie_id = m.id
      JOIN theater t ON s.theater_id = t.id
      WHERE s.id = ?
    `, [result.insertId]);

    res.status(201).json(shows[0]);
  } catch (error) {
    console.error('Show creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete show
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM shows WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Show not found' });
    }
    res.json({ message: 'Show deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export const showRoutes = router;