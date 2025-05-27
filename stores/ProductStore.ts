import { makeAutoObservable, runInAction } from 'mobx';
const API_BASE_URL = 'https://api.koleso.app/api/auto.php';

class ProductStore {
  products = [];
  loading = true;
  page = 1;
  hasMore = true;
  isManualRefresh = false;
  isInitialLoad = true;
  isBackgroundLoad = false;
  carFilter = null;
  carParams = null;
  error = null;
  
  filters = {
    inStockOnly: false,
    season: null,
    spiked: null,
    runflat_tech: null,
    sort: null
  };

  constructor() {
    makeAutoObservable(this);
  }

  get filteredProducts() {
    // Здесь можно добавить логику фильтрации, если нужно
    return this.products;
  }

  setFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    this.page = 1;
  }

  removeFilter(key) {
    this.filters = { ...this.filters, [key]: null };
    this.page = 1;
    this.fetchProducts(true);
  }

  setSort(sortType) {
    this.filters.sort = sortType;
    this.page = 1;
  }

  async fetchProducts(reset = false, explicitPage = null) {
    try {
      const currentPage = explicitPage !== null ? explicitPage : (reset ? 1 : this.page);
      
      if (reset) {
        if (!this.isManualRefresh) this.isInitialLoad = true;
        this.isManualRefresh = true;
      } else {
        this.isBackgroundLoad = true;
      }
      
      this.loading = true;

      

      const params = new URLSearchParams();
      
      
      Object.entries(this.filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(`${key}[]`, v));
          } else if (typeof value === 'boolean') {
            if (value) params.append(key, '1');
          } else {
            params.append(key, value);
          }
        }
      });

      console.log('params car ' + this.carFilter);
      if (this.carFilter) {
        params.append('car_marka', this.carFilter.marka);
        params.append('car_model', this.carFilter.model);
        params.append('car_year', this.carFilter.year);
        params.append('car_modification', this.carFilter.modification);

        if (params.category === '') {
          delete params.category;
        }
       // params.car_marka = this.carFilter.marka;
        //params.car_model = this.carFilter.model;
        //params.car_year = this.carFilter.year;
        //params.car_modification = this.carFilter.modification;
      }
      
      params.append('page', currentPage);
      params.append('per_page', 16);


     

      const response = await fetch(`https://api.koleso.app/api/filter_products.php?${params.toString()}`);
      console.log(response);
      const data = await response.json();

      runInAction(() => {
        if (reset) {
          this.products = data.data;
          this.page = 1;
          this.isManualRefresh = false;
        } else {
          const existingSkus = new Set(this.products.map(p => p.sku));
          const newItems = data.data.filter(item => !existingSkus.has(item.sku));
          this.products = [...this.products, ...newItems];
          this.page = currentPage + 1;
        }
        
        this.hasMore = data.pagination.current_page < data.pagination.last_page;
        this.loading = false;
        
        if (reset) {
          this.isInitialLoad = false;
        } else {
          this.isBackgroundLoad = false;
        }
      });
    } catch (error) {
      runInAction(() => {
        this.loading = false;
        this.isManualRefresh = false;
        this.isInitialLoad = false;
        this.isBackgroundLoad = false;
      });
      console.error('Error fetching products:', error);
    }
  }



  async fetchData(url, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`${API_BASE_URL}/auto.php?action=${url}&${queryString}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
      }
      
      return data.data;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  async fetchCarMarks() {
    return this.fetchData('marks');
  }

  async fetchCarModels(marka) {
    return this.fetchData('models', { marka });
  }

  async fetchCarYears(marka, model) {
    return this.fetchData('years', { marka, model });
  }

  async fetchCarModifications(marka, model, year) {
    return this.fetchData('modifications', { marka, model, year });
  }

  async fetchCarParams(marka, model, modification) {
    return this.fetchData('params', { marka, model, modification });
  }

  async setCarFilter(filter) {
    this.loading = true;
    try {
      this.carFilter = filter;
      this.carParams = await this.fetchCarParams(filter.marka, filter.model, filter.modification);
      console.log(this.carParams);
      console.log(this.carFilter);
      await this.fetchProducts(true);
    } catch (error) {
      this.error = error.message;
    } finally {
      this.loading = false;
    }
  }

  clearCarFilter() {
    this.carFilter = null;
    this.carParams = null;
    this.fetchProducts(true);
  }

  reset() {
    this.products = [];
    this.loading = true;
    this.page = 1;
    this.hasMore = true;
    this.isManualRefresh = false;
    this.isInitialLoad = true;
    this.isBackgroundLoad = false;
    this.filters = {
      inStockOnly: false,
      season: null,
      spiked: null,
      runflat_tech: null,
      sort: null
    };
  }
}







 
export const productStore = new ProductStore();