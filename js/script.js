const API_KEY = 'api_key=1cf50e6248dc270629e802686245c2c8';
const API_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// State
let currentTab = 'nowplaying';
let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
let searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
let currentMovie = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    loadHeroMovies();
    loadMovies('now_playing');
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Tab Navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', handleTabClick);
    });

    // Search Input
    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        searchTimeout = setTimeout(() => {
            if (query) {
                console.log('Searching for:', query);
                searchMovies(query);
            } else {
                // Если поиск пустой, показываем hero и загружаем фильмы
                document.querySelector('.hero-section').style.display = 'block';
                loadHeroMovies();
                loadMovies('now_playing');
            }
        }, 500);
    });

    // Bottom Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavClick);
    });

    // Back Buttons
    document.getElementById('backBtn').addEventListener('click', () => {
        document.getElementById('detailPage').classList.remove('active');
    });

    document.getElementById('watchlistBackBtn').addEventListener('click', () => {
        document.getElementById('watchlistPage').classList.remove('active');
        document.querySelector('[data-page="home"]').click();
    });

    document.getElementById('searchBackBtn').addEventListener('click', () => {
        document.getElementById('searchPage').classList.remove('active');
        document.querySelector('[data-page="home"]').click();
    });

    // Bookmark Button
    document.getElementById('bookmarkBtn').addEventListener('click', toggleBookmark);
}

// Tab Click Handler
function handleTabClick(e) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    
    const tabName = e.target.dataset.tab;
    currentTab = tabName;
    
    const endpoints = {
        'nowplaying': 'now_playing',
        'upcoming': 'upcoming',
        'toprated': 'top_rated',
        'popular': 'popular'
    };
    
    loadMovies(endpoints[tabName]);
}

// Navigation Click Handler
function handleNavClick(e) {
    const page = e.currentTarget.dataset.page;
    
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    document.getElementById('homePage').style.display = page === 'home' ? 'block' : 'none';
    document.getElementById('watchlistPage').classList.toggle('active', page === 'watchlist');
    document.getElementById('searchPage').classList.toggle('active', page === 'search');
    document.getElementById('detailPage').classList.remove('active');
    
    if (page === 'watchlist') {
        loadWatchlist();
    }
    
    if (page === 'search') {
        loadSearchPage();
    }
    
    if (page === 'home') {
        document.querySelector('.hero-section').style.display = 'block';
        loadHeroMovies();
    }
}

// Load Hero Movies (показываем горизонтальную прокрутку)
async function loadHeroMovies() {
    try {
        const response = await fetch(`${API_BASE}/movie/popular?${API_KEY}&language=en-US&page=1`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.results) {
            console.error('No results from API');
            return;
        }
        
        const heroGrid = document.getElementById('heroGrid');
        heroGrid.innerHTML = data.results.slice(0, 6).map((movie) => `
            <div class="hero-card" onclick="showDetail(${movie.id})">
                <img src="${IMG_BASE}${movie.poster_path}" 
                     alt="${movie.title}" 
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            </div>
        `).join('');
        
        console.log('Hero movies loaded:', data.results.length);
    } catch (error) {
        console.error('Error loading hero movies:', error);
        document.getElementById('heroGrid').innerHTML = '<p style="color: red; padding: 20px;">Failed to load movies. Check console.</p>';
    }
}

// Load Movies by Category
async function loadMovies(endpoint) {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('moviesGrid');
    
    loading.style.display = 'block';
    grid.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE}/movie/${endpoint}?${API_KEY}&language=en-US&page=1`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            grid.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-film"></i></div><p>No movies found</p></div>';
            return;
        }
        
        grid.innerHTML = data.results.map(movie => {
            if (!movie.poster_path) return '';
            return `
                <div class="movie-card" onclick="showDetail(${movie.id})">
                    <img src="${IMG_BASE}${movie.poster_path}" 
                         alt="${movie.title}"
                         onerror="this.parentElement.style.display='none'">
                </div>
            `;
        }).join('');
        
        console.log(`Loaded ${data.results.length} movies for ${endpoint}`);
    } catch (error) {
        console.error('Error loading movies:', error);
        grid.innerHTML = '<p class="error">Failed to load movies. Please check your internet connection.</p>';
    } finally {
        loading.style.display = 'none';
    }
}

// Search Movies
async function searchMovies(query) {
    const loading = document.getElementById('loading');
    const grid = document.getElementById('moviesGrid');
    
    // Скрываем hero-секцию при поиске
    document.querySelector('.hero-section').style.display = 'none';
    
    loading.style.display = 'block';
    grid.innerHTML = '';
    
    try {
        const response = await fetch(`${API_BASE}/search/movie?${API_KEY}&language=en-US&query=${encodeURIComponent(query)}&page=1`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Сохраняем поиск в историю
        addToSearchHistory(query);
        
        if (!data.results || data.results.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-search"></i></div>
                    <p>No results found for "${query}"</p>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = data.results.map(movie => {
            if (!movie.poster_path) return '';
            return `
                <div class="movie-card" onclick="showDetail(${movie.id})">
                    <img src="${IMG_BASE}${movie.poster_path}" 
                         alt="${movie.title}"
                         onerror="this.parentElement.style.display='none'">
                </div>
            `;
        }).join('');
        
        console.log(`Found ${data.results.length} movies for query: ${query}`);
    } catch (error) {
        console.error('Error searching movies:', error);
        grid.innerHTML = '<p class="error">Search failed. Please try again.</p>';
    } finally {
        loading.style.display = 'none';
    }
}

// Show Movie Detail
async function showDetail(movieId) {
    console.log('Loading details for movie:', movieId);
    
    try {
        const response = await fetch(`${API_BASE}/movie/${movieId}?${API_KEY}&language=en-US&append_to_response=credits,videos`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const movie = await response.json();
        
        if (!movie.id) {
            console.error('Invalid movie data');
            return;
        }
        
        currentMovie = movie;
        
        // Check if movie is bookmarked
        const isBookmarked = watchlist.some(m => m.id === movie.id);
        document.getElementById('bookmarkBtn').classList.toggle('active', isBookmarked);
        
        // Render detail page
        document.getElementById('detailContent').innerHTML = `
            <div class="detail-hero">
                <img src="${movie.backdrop_path ? IMG_ORIGINAL + movie.backdrop_path : IMG_BASE + movie.poster_path}" 
                     alt="${movie.title}"
                     onerror="this.src='${IMG_BASE}${movie.poster_path}'">
                <div class="detail-poster">
                    <img src="${IMG_BASE}${movie.poster_path}" 
                         alt="${movie.title}"
                         onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                </div>
                <div class="detail-rating">
                    <i class="fas fa-star star-icon"></i>
                    <span class="rating-value">${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                </div>
            </div>
            <div class="detail-content">
                <h2 class="detail-title">${movie.title}</h2>
                <div class="detail-meta">
                    <div class="meta-item">
                        <i class="far fa-calendar"></i>
                        <span>${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
                    </div>
                    <div class="meta-item">
                        <i class="far fa-clock"></i>
                        <span>${movie.runtime || 'N/A'} Minutes</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-tags"></i>
                        <span>${movie.genres && movie.genres.length > 0 ? movie.genres[0].name : 'Action'}</span>
                    </div>
                </div>
                <div class="detail-tabs">
                    <button class="detail-tab active" onclick="showAbout()">About Movie</button>
                    <button class="detail-tab" onclick="showReviews()">Reviews</button>
                    <button class="detail-tab" onclick="showCast()">Cast</button>
                </div>
                <div id="tabContent">
                    <div class="detail-description">
                        ${movie.overview || 'From DC Comics comes the Suicide Squad, an antihero team of incarcerated supervillains who act as deniable assets for the United States government, undertaking high-risk black ops missions in exchange for commuted prison sentences.'}
                    </div>
                </div>
            </div>
        `;
        
        // Show detail page
        document.getElementById('detailPage').classList.add('active');
        
        console.log('Movie details loaded:', movie.title);
    } catch (error) {
        console.error('Error loading movie details:', error);
        alert('Failed to load movie details. Please try again.');
    }
}

// Show About Tab
function showAbout() {
    if (!currentMovie) return;
    
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.detail-tab')[0].classList.add('active');
    
    const director = currentMovie.credits?.crew?.find(person => person.job === 'Director');
    
    document.getElementById('tabContent').innerHTML = `
        <div class="detail-description">
            ${currentMovie.overview || 'From DC Comics comes the Suicide Squad, an antihero team of incarcerated supervillains who act as deniable assets for the United States government, undertaking high-risk black ops missions in exchange for commuted prison sentences.'}
        </div>
    `;
}

// Show Reviews Tab
function showReviews() {
    if (!currentMovie) return;
    
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.detail-tab')[1].classList.add('active');
    
    document.getElementById('tabContent').innerHTML = `
        <div class="detail-description">
            Reviews feature coming soon...
        </div>
    `;
}

// Show Cast Tab
function showCast() {
    if (!currentMovie) return;
    
    document.querySelectorAll('.detail-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.detail-tab')[2].classList.add('active');
    
    const cast = currentMovie.credits?.cast?.slice(0, 10) || [];
    
    if (cast.length === 0) {
        document.getElementById('tabContent').innerHTML = '<p class="detail-description">No cast information available.</p>';
        return;
    }
    
    document.getElementById('tabContent').innerHTML = `
        <div style="display: grid; gap: 15px;">
            ${cast.map(actor => `
                <div style="display: flex; gap: 15px; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px;">
                    ${actor.profile_path ? 
                        `<img src="${IMG_BASE}${actor.profile_path}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover;">` :
                        `<div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 24px;"><i class="fas fa-user"></i></div>`
                    }
                    <div>
                        <p style="font-weight: 600; margin-bottom: 3px;">${actor.name}</p>
                        <p style="color: rgba(255,255,255,0.5); font-size: 14px;">${actor.character}</p>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Toggle Bookmark
function toggleBookmark() {
    if (!currentMovie) return;
    
    const index = watchlist.findIndex(m => m.id === currentMovie.id);
    const btn = document.getElementById('bookmarkBtn');
    
    if (index > -1) {
        // Remove from watchlist
        watchlist.splice(index, 1);
        btn.classList.remove('active');
        console.log('Removed from watchlist:', currentMovie.title);
    } else {
        // Add to watchlist
        watchlist.push(currentMovie);
        btn.classList.add('active');
        console.log('Added to watchlist:', currentMovie.title);
    }
    
    // Save to localStorage
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
}

// Load Watchlist
function loadWatchlist() {
    const content = document.getElementById('watchlistContent');
    
    if (watchlist.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon"><i class="fas fa-bookmark"></i></div>
                <p>Your watch list is empty</p>
                <p style="margin-top: 10px; font-size: 14px; opacity: 0.6;">Add movies to watch them later</p>
            </div>
        `;
        return;
    }
    
    content.innerHTML = `
        <div class="watchlist-grid">
            ${watchlist.map(movie => `
                <div class="watchlist-item" onclick="showDetail(${movie.id})">
                    <div class="watchlist-poster">
                        <img src="${IMG_BASE}${movie.poster_path}" 
                             alt="${movie.title}"
                             onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                    </div>
                    <div class="watchlist-info">
                        <h3 class="watchlist-title">${movie.title}</h3>
                        <div class="watchlist-meta">
                            <div class="watchlist-meta-item">
                                <i class="fas fa-star"></i>
                                <span>${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}</span>
                            </div>
                            <div class="watchlist-meta-item">
                                <i class="fas fa-tags"></i>
                                <span>${movie.genres && movie.genres[0] ? movie.genres[0].name : 'Action'}</span>
                            </div>
                            <div class="watchlist-meta-item">
                                <i class="far fa-calendar"></i>
                                <span>${movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}</span>
                            </div>
                            <div class="watchlist-meta-item">
                                <i class="far fa-clock"></i>
                                <span>${movie.runtime || 'N/A'} minutes</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    console.log('Watchlist loaded:', watchlist.length, 'movies');
}

// Search Page Functions
async function loadSearchPage() {
    loadSearchHistory();
    loadSearchRecommendations();
}

// Функция загрузки истории поиска
function loadSearchHistory() {
    const historyItems = document.getElementById('searchHistoryItems');
    const searchHistoryContainer = document.getElementById('searchHistory');
    
    if (searchHistory.length === 0) {
        searchHistoryContainer.style.display = 'none';
        return;
    }
    
    searchHistoryContainer.style.display = 'block';
    
    // Показываем последние 6 поисков
    const recentSearches = searchHistory.slice(0, 6);
    historyItems.innerHTML = recentSearches.map(term => `
        <div class="search-history-item" onclick="performSearchFromHistory('${term}')">
            ${term}
        </div>
    `).join('');
}

// Функция загрузки рекомендаций для поиска
async function loadSearchRecommendations() {
    const grid = document.getElementById('searchRecommendationsGrid');
    
    try {
        const response = await fetch(`${API_BASE}/movie/popular?${API_KEY}&language=en-US&page=1`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.results || data.results.length === 0) {
            grid.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 20px;">No recommendations available</p>';
            return;
        }
        
        // Показываем 8 популярных фильмов как рекомендации
        grid.innerHTML = data.results.slice(0, 8).map(movie => {
            if (!movie.poster_path) return '';
            return `
                <div class="movie-card" onclick="showDetail(${movie.id})">
                    <img src="${IMG_BASE}${movie.poster_path}" 
                         alt="${movie.title}"
                         onerror="this.parentElement.style.display='none'">
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading search recommendations:', error);
        grid.innerHTML = '<p style="color: rgba(255,255,255,0.5); padding: 20px;">Failed to load recommendations</p>';
    }
}

// Функция добавления в историю поиска
function addToSearchHistory(query) {
    // Удаляем дубликаты
    searchHistory = searchHistory.filter(term => term.toLowerCase() !== query.toLowerCase());
    
    // Добавляем в начало
    searchHistory.unshift(query);
    
    // Ограничиваем историю 10 элементами
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }
    
    // Сохраняем в localStorage
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

// Функция поиска из истории
function performSearchFromHistory(query) {
    // Переключаемся на домашнюю страницу
    document.querySelector('[data-page="home"]').click();
    
    // Устанавливаем значение поиска
    const searchInput = document.getElementById('searchInput');
    searchInput.value = query;
    searchInput.focus();
    
    // Выполняем поиск
    searchMovies(query);
}

// Make functions global for onclick handlers
window.showDetail = showDetail;
window.showAbout = showAbout;
window.showReviews = showReviews;
window.showCast = showCast;
window.performSearchFromHistory = performSearchFromHistory;