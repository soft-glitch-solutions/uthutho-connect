
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import * as postgres from "https://deno.land/x/postgres@v0.14.2/mod.ts";

console.log("Cleaning up old login streaks where points have been awarded...");

serve(async (req) => {
  try {
    // Create a database connection
    const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
    const pool = new postgres.Pool(dbUrl, 3, true);

    // Get a connection from the pool
    const connection = await pool.connect();

    try {
      // Begin a transaction
      await connection.queryObject("BEGIN");

      // Get all completed streaks (multiples of 7) that are more than 7 days old
      // This means we've already awarded points for them
      const { rows: completeStreaks } = await connection.queryObject(`
        SELECT ls.id, ls.user_id, ls.current_streak
        FROM login_streaks ls
        WHERE 
          ls.current_streak % 7 = 0
          AND ls.last_login < NOW() - INTERVAL '7 days'
      `);

      if (completeStreaks.length > 0) {
        console.log(`Found ${completeStreaks.length} completed streaks to process`);

        // For each streak, add a completed mission record if applicable
        for (const streak of completeStreaks) {
          // Find any login streak missions
          const { rows: loginMissions } = await connection.queryObject(`
            SELECT id, requirement_count, points_reward
            FROM missions
            WHERE requirement_type = 'login_streak'
            ORDER BY requirement_count ASC
          `);

          // Check if any mission requirements are met with the current streak
          for (const mission of loginMissions) {
            if (streak.current_streak >= mission.requirement_count) {
              // Check if mission progress already exists
              const { rows: existingProgress } = await connection.queryObject(`
                SELECT id, current_count, is_completed
                FROM mission_progress
                WHERE user_id = $1 AND mission_id = $2
              `, [streak.user_id, mission.id]);

              if (existingProgress.length === 0) {
                // Create a new mission progress record
                await connection.queryObject(`
                  INSERT INTO mission_progress
                  (user_id, mission_id, current_count, is_completed)
                  VALUES ($1, $2, $3, true)
                `, [streak.user_id, mission.id, streak.current_streak]);
              } else if (!existingProgress[0].is_completed) {
                // Update an existing record
                await connection.queryObject(`
                  UPDATE mission_progress
                  SET current_count = $1, is_completed = true
                  WHERE id = $2
                `, [streak.current_streak, existingProgress[0].id]);
              }
            }
          }
        }

        // Reset all processed streaks to 0
        const resetCount = await connection.queryObject(`
          UPDATE login_streaks
          SET current_streak = 0
          WHERE id = ANY($1::uuid[])
        `, [completeStreaks.map(s => s.id)]);

        console.log(`Reset ${resetCount.rowCount} streaks to 0`);
      } else {
        console.log("No completed streaks found to process");
      }

      // Commit the transaction
      await connection.queryObject("COMMIT");

      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: completeStreaks.length 
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (error) {
      // Rollback the transaction on error
      await connection.queryObject("ROLLBACK");
      throw error;
    } finally {
      // Release the connection back to the pool
      connection.release();
    }
  } catch (error) {
    console.error("Error processing streaks:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
