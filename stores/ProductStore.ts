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
  yearsFullData = []; // Для хранения полных данных о годах
  
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

      if (this.carFilter) {
        params.append('car_marka', this.carFilter.marka);
        params.append('car_model', this.carFilter.model);
        params.append('car_kuzov', this.carFilter.kuzov);
        params.append('car_beginyear', this.carFilter.beginyear);
        params.append('car_endyear', this.carFilter.endyear);
        params.append('car_modification', this.carFilter.modification);
        // Добавляем carid если он есть
        if (this.carFilter.carid) {
          params.append('carid', this.carFilter.carid);
        }
      }
      
      params.append('page', currentPage);
      params.append('per_page', 16);

      const response = await fetch(`https://api.koleso.app/api/filter_products.php?${params.toString()}`);
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
      const response = await fetch(`${API_BASE_URL}?action=${url}&${queryString}`);
      
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

  // Обновленный метод для получения данных о годах
  async fetchCarYears(marka, model) {
    const yearsData = await this.fetchData('years', { marka, model });
    
    runInAction(() => {
      this.yearsFullData = yearsData || [];
    });
    
    // Возвращаем массив строк для отображения
    return this.yearsFullData.map(item => item.display || '');
  }

  // Метод для получения полных данных по году
  getYearFullData(displayString) {
    if (!displayString || !this.yearsFullData) return null;
    return this.yearsFullData.find(item => 
      item?.display?.toString() === displayString.toString()
    );
  }

  // Обновленный метод получения модификаций
  async fetchCarModifications(marka, model, yearDisplay) {
    try {
      // Получаем полные данные о выбранном годе
      const yearData = this.getYearFullData(yearDisplay);
      if (!yearData) {
        throw new Error('Данные о годе не найдены');
      }

      // Получаем модификации с учетом всех параметров
      const modifications = await this.fetchData('modifications', {
        marka,
        model,
        kuzov: yearData.kuzov,
        beginyear: yearData.beginyear,
        endyear: yearData.endyear
      });

      return modifications || [];
    } catch (error) {
      console.error('Ошибка при получении модификаций:', error);
      throw error;
    }
  }

  // Дополнительный метод для получения модификаций по конкретному году
  async fetchCarModificationsByYear(marka, model, kuzov, year) {
    try {
      const modifications = await this.fetchData('modifications_by_year', {
        marka,
        model,
        kuzov,
        year
      });

      return modifications || [];
    } catch (error) {
      console.error('Ошибка при получении модификаций по году:', error);
      return [];
    }
  }

  // Обновленный метод получения параметров автомобиля
  async fetchCarParams(marka, model, modification, yearData = null) {
    try {
      const params = { marka, model, modification };
      
      // Добавляем параметры года если они есть
      if (yearData) {
        params.kuzov = yearData.kuzov;
        params.beginyear = yearData.beginyear;
        params.endyear = yearData.endyear;
      }

      const carData = await this.fetchData('params', params);
      
      if (!carData) {
        throw new Error('Автомобиль не найден с указанными параметрами');
      }

      return carData;
    } catch (error) {
      console.error('Ошибка при получении параметров автомобиля:', error);
      throw error;
    }
  }

  // Метод для получения информации об автомобиле по ID
  async fetchCarById(carid) {
    try {
      const carData = await this.fetchData('car_by_id', { carid });
      
      if (!carData) {
        throw new Error('Автомобиль не найден');
      }

      return carData;
    } catch (error) {
      console.error('Ошибка при получении данных автомобиля по ID:', error);
      throw error;
    }
  }

  // Обновленный метод установки фильтра автомобиля
  async setCarFilter(filter) {
    this.loading = true;
    this.error = null;
    
    try {
      // Получаем данные о годе для точного поиска
      const yearData = filter.yearData || this.getYearFullData(filter.yearDisplay);
      
      if (!yearData && filter.yearDisplay) {
        throw new Error('Данные о годе не найдены');
      }

      // Получаем параметры автомобиля с учетом всех данных
      const carParams = await this.fetchCarParams(
        filter.marka, 
        filter.model, 
        filter.modification,
        yearData
      );

      runInAction(() => {
        // Сохраняем полный фильтр с ID автомобиля
        this.carFilter = {
          ...filter,
          carid: carParams.carid,
          kuzov: yearData?.kuzov || filter.kuzov,
          beginyear: yearData?.beginyear || filter.beginyear,
          endyear: yearData?.endyear || filter.endyear
        };
        
        this.carParams = carParams;
      });

      // Загружаем продукты с новым фильтром
      await this.fetchProducts(true);
      
    } catch (error) {
      runInAction(() => {
        this.error = error.message;
      });
      console.error('Ошибка при установке фильтра автомобиля:', error);
    } finally {
      runInAction(() => {
        this.loading = false;
      });
    }
  }

  // Обновление фильтра автомобиля с сохранением существующих данных
  updateCarFilter(updates) {
    if (this.carFilter) {
      runInAction(() => {
        this.carFilter = { ...this.carFilter, ...updates };
      });
    }
  }

  clearCarFilter() {
    runInAction(() => {
      this.carFilter = null;
      this.carParams = null;
      this.error = null;
    });
    this.fetchProducts(true);
  }

  reset() {
    runInAction(() => {
      this.products = [];
      this.loading = true;
      this.page = 1;
      this.hasMore = true;
      this.isManualRefresh = false;
      this.isInitialLoad = true;
      this.isBackgroundLoad = false;
      this.carFilter = null;
      this.carParams = null;
      this.error = null;
      this.yearsFullData = [];
      this.filters = {
        inStockOnly: false,
        season: null,
        spiked: null,
        runflat_tech: null,
        sort: null
      };
    });
  }

  // Вспомогательный метод для создания полного объекта фильтра
  createCarFilter(marka, model, yearDisplay, modification) {
    const yearData = this.getYearFullData(yearDisplay);
    
    if (!yearData) {
      throw new Error('Данные о годе не найдены');
    }

    return {
      marka,
      model,
      modification,
      yearDisplay,
      yearData,
      kuzov: yearData.kuzov,
      beginyear: yearData.beginyear,
      endyear: yearData.endyear
    };
  }

  // Метод для валидации данных автомобиля
  validateCarData(marka, model, yearDisplay, modification) {
    if (!marka || !model || !yearDisplay || !modification) {
      return false;
    }

    const yearData = this.getYearFullData(yearDisplay);
    return yearData !== null;
  }
}

export const productStore = new ProductStore();