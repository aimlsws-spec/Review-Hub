/**
 * Every Indian state and union territory, each with a starter list of major cities.
 *
 * The states are complete. The cities are NOT: this is a starting set so the pickers work on day one, and a
 * fuller list should be imported before launch. Names are the ones people use day to day. Seeding is idempotent,
 * so adding a city here and running the seed again adds only that city.
 */
export interface SeedState {
  name: string;
  code: string;
  cities: string[];
}

export const INDIA_LOCATIONS: SeedState[] = [
  // ── States ──────────────────────────────────────────────────
  { name: 'Andhra Pradesh', code: 'AP', cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool', 'Rajahmundry', 'Kakinada'] },
  { name: 'Arunachal Pradesh', code: 'AR', cities: ['Itanagar', 'Naharlagun', 'Pasighat'] },
  { name: 'Assam', code: 'AS', cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tezpur'] },
  { name: 'Bihar', code: 'BR', cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah'] },
  { name: 'Chhattisgarh', code: 'CG', cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Raigarh'] },
  { name: 'Goa', code: 'GA', cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'] },
  {
    name: 'Gujarat',
    code: 'GJ',
    cities: [
      'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Anand', 'Nadiad',
      'Mehsana', 'Morbi', 'Bharuch', 'Navsari', 'Vapi', 'Bhuj', 'Gandhidham', 'Porbandar', 'Surendranagar', 'Amreli',
      'Palanpur', 'Patan', 'Godhra', 'Valsad', 'Ankleshwar', 'Veraval', 'Botad',
    ],
  },
  { name: 'Haryana', code: 'HR', cities: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Rohtak', 'Hisar', 'Sonipat', 'Panchkula'] },
  { name: 'Himachal Pradesh', code: 'HP', cities: ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali'] },
  { name: 'Jharkhand', code: 'JH', cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Hazaribagh', 'Deoghar'] },
  { name: 'Karnataka', code: 'KA', cities: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi', 'Kalaburagi', 'Davanagere', 'Ballari', 'Shivamogga', 'Udupi'] },
  { name: 'Kerala', code: 'KL', cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad', 'Kottayam'] },
  { name: 'Madhya Pradesh', code: 'MP', cities: ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa', 'Satna'] },
  {
    name: 'Maharashtra',
    code: 'MH',
    cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai', 'Pimpri-Chinchwad', 'Sangli'],
  },
  { name: 'Manipur', code: 'MN', cities: ['Imphal', 'Thoubal', 'Bishnupur'] },
  { name: 'Meghalaya', code: 'ML', cities: ['Shillong', 'Tura', 'Jowai'] },
  { name: 'Mizoram', code: 'MZ', cities: ['Aizawl', 'Lunglei', 'Champhai'] },
  { name: 'Nagaland', code: 'NL', cities: ['Kohima', 'Dimapur', 'Mokokchung'] },
  { name: 'Odisha', code: 'OD', cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri'] },
  { name: 'Punjab', code: 'PB', cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali'] },
  { name: 'Rajasthan', code: 'RJ', cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara'] },
  { name: 'Sikkim', code: 'SK', cities: ['Gangtok', 'Namchi', 'Gyalshing'] },
  { name: 'Tamil Nadu', code: 'TN', cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi'] },
  { name: 'Telangana', code: 'TS', cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Secunderabad'] },
  { name: 'Tripura', code: 'TR', cities: ['Agartala', 'Udaipur', 'Dharmanagar'] },
  { name: 'Uttar Pradesh', code: 'UP', cities: ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida', 'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur'] },
  { name: 'Uttarakhand', code: 'UK', cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Nainital'] },
  { name: 'West Bengal', code: 'WB', cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman'] },

  // ── Union territories ───────────────────────────────────────
  { name: 'Andaman and Nicobar Islands', code: 'AN', cities: ['Port Blair'] },
  { name: 'Chandigarh', code: 'CH', cities: ['Chandigarh'] },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DD', cities: ['Daman', 'Diu', 'Silvassa'] },
  { name: 'Delhi', code: 'DL', cities: ['New Delhi', 'Dwarka', 'Rohini', 'Saket'] },
  { name: 'Jammu and Kashmir', code: 'JK', cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla'] },
  { name: 'Ladakh', code: 'LA', cities: ['Leh', 'Kargil'] },
  { name: 'Lakshadweep', code: 'LD', cities: ['Kavaratti'] },
  { name: 'Puducherry', code: 'PY', cities: ['Puducherry', 'Karaikal'] },
];
