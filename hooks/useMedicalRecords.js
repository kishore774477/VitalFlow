import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Form fields left blank come through as '' which Postgres rejects for date/number columns
const clean = (record) =>
  Object.fromEntries(Object.entries(record || {}).map(([k, v]) => [k, v === '' ? null : v]));

export function useMedicalRecords(userId) {
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [medications, setMedications] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchEmergencyContacts(),
        fetchMedications(),
        fetchConditions(),
        fetchAllergies(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmergencyContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      setEmergencyContacts(data || []);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
    }
  };

  // ── Medications ─────────────────────────────────────────────────────────────

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMedications(data || []);
    } catch (error) {
      console.error('Error fetching medications:', error);
    }
  };

  const addMedication = async (medication) => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .insert([{ ...clean(medication), user_id: userId }])
        .select()
        .single();
      if (error) throw error;
      setMedications((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error adding medication:', error);
      return { data: null, error: error.message };
    }
  };

  const updateMedication = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .update(clean(updates))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      setMedications((prev) => prev.map((m) => (m.id === id ? data : m)));
      return { data, error: null };
    } catch (error) {
      console.error('Error updating medication:', error);
      return { data: null, error: error.message };
    }
  };

  const deleteMedication = async (id) => {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setMedications((prev) => prev.filter((m) => m.id !== id));
      return { error: null };
    } catch (error) {
      console.error('Error deleting medication:', error);
      return { error: error.message };
    }
  };

  // ── Conditions ──────────────────────────────────────────────────────────────

  const fetchConditions = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_conditions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setConditions(data || []);
    } catch (error) {
      console.error('Error fetching conditions:', error);
    }
  };

  const addCondition = async (condition) => {
    try {
      const { data, error } = await supabase
        .from('medical_conditions')
        .insert([{ ...clean(condition), user_id: userId }])
        .select()
        .single();
      if (error) throw error;
      setConditions((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error adding condition:', error);
      return { data: null, error: error.message };
    }
  };

  const updateCondition = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('medical_conditions')
        .update(clean(updates))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      setConditions((prev) => prev.map((c) => (c.id === id ? data : c)));
      return { data, error: null };
    } catch (error) {
      console.error('Error updating condition:', error);
      return { data: null, error: error.message };
    }
  };

  const deleteCondition = async (id) => {
    try {
      const { error } = await supabase
        .from('medical_conditions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setConditions((prev) => prev.filter((c) => c.id !== id));
      return { error: null };
    } catch (error) {
      console.error('Error deleting condition:', error);
      return { error: error.message };
    }
  };

  // ── Allergies ───────────────────────────────────────────────────────────────

  const fetchAllergies = async () => {
    try {
      const { data, error } = await supabase
        .from('allergies')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllergies(data || []);
    } catch (error) {
      console.error('Error fetching allergies:', error);
    }
  };

  const addAllergy = async (allergy) => {
    try {
      const { data, error } = await supabase
        .from('allergies')
        .insert([{ ...clean(allergy), user_id: userId }])
        .select()
        .single();
      if (error) throw error;
      setAllergies((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (error) {
      console.error('Error adding allergy:', error);
      return { data: null, error: error.message };
    }
  };

  const updateAllergy = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('allergies')
        .update(clean(updates))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      setAllergies((prev) => prev.map((a) => (a.id === id ? data : a)));
      return { data, error: null };
    } catch (error) {
      console.error('Error updating allergy:', error);
      return { data: null, error: error.message };
    }
  };

  const deleteAllergy = async (id) => {
    try {
      const { error } = await supabase
        .from('allergies')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setAllergies((prev) => prev.filter((a) => a.id !== id));
      return { error: null };
    } catch (error) {
      console.error('Error deleting allergy:', error);
      return { error: error.message };
    }
  };

  const addEmergencyContact = async (contact) => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .insert([{ ...clean(contact), user_id: userId }])
        .select()
        .single();

      if (error) throw error;

      setEmergencyContacts([...emergencyContacts, data]);
      return { data, error: null };
    } catch (error) {
      console.error('Error adding emergency contact:', error);
      return { data: null, error: error.message };
    }
  };

  const updateEmergencyContact = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('emergency_contacts')
        .update(clean(updates))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      setEmergencyContacts(
        emergencyContacts.map((contact) =>
          contact.id === id ? data : contact
        )
      );
      return { data, error: null };
    } catch (error) {
      console.error('Error updating emergency contact:', error);
      return { data: null, error: error.message };
    }
  };

  const deleteEmergencyContact = async (id) => {
    try {
      const { error } = await supabase
        .from('emergency_contacts')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;

      setEmergencyContacts(
        emergencyContacts.filter((contact) => contact.id !== id)
      );
      return { error: null };
    } catch (error) {
      console.error('Error deleting emergency contact:', error);
      return { error: error.message };
    }
  };

  return {
    emergencyContacts,
    medications,
    conditions,
    allergies,
    loading,
    addEmergencyContact,
    updateEmergencyContact,
    deleteEmergencyContact,
    addMedication,
    updateMedication,
    deleteMedication,
    addCondition,
    updateCondition,
    deleteCondition,
    addAllergy,
    updateAllergy,
    deleteAllergy,
    refetch: fetchAll,
  };
}