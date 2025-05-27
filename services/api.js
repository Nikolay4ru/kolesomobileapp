import axios from 'axios';

const API_URL = 'https://api.koleso.app/api/auto.php';

export const getMarks = async () => {
  try {
    const response = await axios.get(`${API_URL}?action=get_marks`);
    return response.data;
  } catch (error) {
    console.error('Error fetching marks:', error);
    throw error;
  }
};

export const getModels = async (marka) => {
  try {
    const response = await axios.get(`${API_URL}?action=get_models&marka=${marka}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching models:', error);
    throw error;
  }
};

export const getModifications = async (marka, model) => {
  try {
    const response = await axios.get(
      `${API_URL}?action=get_modifications&marka=${marka}&model=${model}`
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching modifications:', error);
    throw error;
  }
};

export const getCarDetails = async (carid) => {
  try {
    const response = await axios.get(`${API_URL}?action=get_car_details&carid=${carid}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching car details:', error);
    throw error;
  }
};

export const searchProducts = async (type, params) => {
  try {
    const response = await axios.post(
      `${API_URL}?action=search_products&type=${type}`,
      params
    );
    return response.data;
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};