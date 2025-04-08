const supabase = require('../config/supabase');

const participantController = {
  async getParticipants(req, res) {
    try {
      console.log('Fetching participants information');
      const { data, error } = await supabase.from('participants').select(`
          id,
          participant_created_at,
          participant_updated_at,
          participant_general_info (
            id,
            first_name,
            last_name,
            care_giver,
            status
          )
        `);

      if (error) {
        console.log(error.message);
        return res.status(400).json({ error: error.message });
      }
      if (data) {
        return res.json(data);
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  async getParticipantInfo(req, res) {
    try {
      const { participantid } = req.params;
      console.log('Fetching participant info:', participantid);
      const { data, error } = await supabase
        .from('participants')
        .select(
          `
          id,
          participant_updated_at,
          participant_created_at,
          participant_general_info(*),
          participant_demographics(*),
          participant_address_and_contact(*),
          participant_marital_status(*)
        `
        )
        .eq('id', participantid)
        .single();

      if (error) {
        console.log(error.message);
        return res.status(400).json({ error: error.message });
      }
      if (data) {
        return res.json(data);
      }
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
  async updateParticipant(req, res) {
    let participantId = null; //initialized to null to avoid reference error in catch block
    let updatedTables = []; // initialized to empty array to avoid reference error in catch block
    try {
      const { participantid } = req.params;
      participantId = participantid;
      console.log('Checking if participant exists:', participantId);
      const { data: existingData, error: checkError } = await supabase
        .from('participants')
        .select(`*`)
        .eq('id', participantId)
        .maybeSingle();
      if (checkError) {
        throw checkError;
      }
      if (!existingData) {
        //participant with such id does not exist in participants table
        console.log('Adding participant to participants table', participantId);
        const { data: newParticipant, error: insertError } = await supabase
          .from('participants')
          .insert({ id: participantId })
          .select('id');
        if (insertError) {
          throw insertError;
        }
        if (!newParticipant || newParticipant.length === 0) {
          throw new Error(
            `Failed to insert participant with id ${participantId}`
          );
        }
      }
      let updatedData = { id: participantId }; //keeps track of all the participant's data in the tables that are updated
      for (const [tablename, tabledata] of Object.entries(req.body)) {
        if (tabledata) {
          console.log(
            `Updating the participant data in ${tablename} for ${participantId}`
          );
          const { data, error } = await supabase
            .from(tablename)
            .upsert({ ...tabledata, id: participantId }) //inserts a row if such id is not found in the table and updates it otherwise
            .select('*');
          if (error) {
            throw error;
          }
          if (!data || data.length === 0) {
            throw new Error(`Failed to update ${tablename}`);
          }
          updatedTables.push(tablename); //keeping track of what tables were updated
          updatedData = { ...updatedData, [tablename]: data };
        }
      }
      console.log(
        `Updating participant_updated_at value for participant: ${participantId}`
      );
      const { data: updatedParticipant, error: updatedParticipantError } =
        await supabase
          .from('participants')
          .update({ participant_updated_at: new Date().toISOString() })
          .eq('id', participantId)
          .select('*');
      if (updatedParticipantError) {
        throw updatedParticipantError;
      }
      if (!updatedParticipant || updatedParticipant.length === 0) {
        throw new Error(
          `Failed to update participant_updated_at value at participants table for ${participantId}`
        );
      }
      return res.json({
        updated_data: updatedData,
        updated_tables: updatedTables,
        participantid: participantId,
      });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({
        error: 'Internal server error',
        updated_tables: updatedTables,
        participantid: participantId,
      });
    }
  },
  async deleteParticipant(req, res) {
    try {
      const { participantid } = req.params;
      console.log('Deleting participant:', participantid);
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantid)
        .maybeSingle();

      if (error) {
        console.log(error.message);
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({
        message: `Participant ${participantid} successfully deleted from the database`,
      });
    } catch (error) {
      console.log(error.message);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};
module.exports = participantController;
