/**
 *
 * @param {HTMLElement} container
 * @param {string} classElement
 * @param {HTMLElement} extraElement
 */
function loadingSkeeleton(container, classElement, extraElement) {
    container.innerHTML = '';
    for (let i = 0; i < 10; i++) {
        const elementContainer = document.createElement('div');
        elementContainer.classList.add(classElement, 'skeleton');
        if (extraElement) {
            const clonedExtraElement = extraElement.cloneNode(true);
            elementContainer.appendChild(clonedExtraElement);
        }
        container.appendChild(elementContainer);
    }
}
let globalQuery = '';
let pageGlobal = 1;
let totalPages = 0;
let globalEndpoint = '';

const movieImgExtra = document.createElement('div');
movieImgExtra.classList.add('movie-img', 'skeleton');
const categoryTitleExtra = document.createElement('h3');
categoryTitleExtra.classList.add('category-title');
loadingSkeeleton(trendingMoviesPreviewList, 'movie-container', movieImgExtra);
loadingSkeeleton(
    categoriesPreviewList,
    'category-container',
    categoryTitleExtra
);
const loadingSkeeletonPromise = new Promise((resolve, reject) => {
    try {
        loadingSkeeleton(genericSection, 'genericList-container');
        resolve(); // Resuelve la promesa una vez que la función loadingSkeeleton se haya completado correctamente
    } catch (error) {
        reject(error); // Rechaza la promesa si ocurre algún error
    }
});
loadingSkeeletonPromise.then(() => {
    const skeleton = genericSection.querySelectorAll('.skeleton');
    const width = skeleton[0]?.clientWidth;
    const newHeight = width * 1.5;
    document.documentElement.style.setProperty(
        '--data-height',
        `${newHeight}px`
    );
});

const api = axios.create({
    baseURL: 'https://api.themoviedb.org/3/',
    headers: {
        'Content-Type': 'application/json;charset=utf-8',
    },
    params: {
        api_key: API_KEY,
    },
});

// Utils
const lazyLoader = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            const element = entry.target;
            if (
                entry.isIntersecting &&
                element.dataset['src'] &&
                !element.src
            ) {
                const url = element.dataset['src'];
                element.src = url;
            }
        });
    },
    { threshold: 0.5 }
);

function createMovies(
    movies,
    container,
    { lazy, infinity } = { lazy: false, infinity: false }
) {
    if (!infinity) {
        container.innerHTML = '';
    }
    if (!movies) return;
    movies.forEach((movie) => {
        const movieContainer = document.createElement('div');
        movieContainer.classList.add('movie-container');
        movieContainer.addEventListener('click', () => {
            location.hash = '#movie=' + movie.id;
        });

        const movieImg = document.createElement('img');
        movieImg.classList.add('movie-img');
        movieImg.setAttribute('alt', movie.title);
        if (lazy) {
            movieImg.dataset[
                'src'
            ] = `https://image.tmdb.org/t/p/w300${movie.poster_path}`;

            lazyLoader.observe(movieImg);
        } else {
            movieImg.src = `https://image.tmdb.org/t/p/w300${movie.poster_path}`;
        }
        movieImg.addEventListener('error', () => {
            movieImg.src = 'https://via.placeholder.com/300x450';
        });

        movieContainer.appendChild(movieImg);
        container.appendChild(movieContainer);
    });
    deleteSkeletons();
}

function createCategories(categories, container) {
    container.innerHTML = '';

    categories.forEach((category) => {
        const categoryContainer = document.createElement('div');
        categoryContainer.classList.add('category-container');

        const categoryTitle = document.createElement('h3');
        categoryTitle.classList.add('category-title');
        categoryTitle.setAttribute('id', 'id' + category.id);
        categoryTitle.addEventListener('click', () => {
            location.hash = `#category=${category.id}-${category.name}`;
            globalQuery = category.name;
        });
        const categoryTitleText = document.createTextNode(category.name);

        categoryTitle.appendChild(categoryTitleText);
        categoryContainer.appendChild(categoryTitle);
        container.appendChild(categoryContainer);
    });
}

// Llamados a la API

async function getTrendingMoviesPreview() {
    const { data } = await api('trending/movie/day');
    const movies = data.results;
    createMovies(movies, trendingMoviesPreviewList, true);
}

async function getCategegoriesPreview() {
    const { data } = await api('genre/movie/list');
    const categories = data.genres;

    createCategories(categories, categoriesPreviewList);
}

const deleteSkeletons = () => {
    Array.from(document.querySelectorAll('.skeleton')).forEach((skeleton) => {
        skeleton.remove();
    });
};

const getMovies = async ({ query, endpoint }) => {
    const { data } = await api(endpoint, {
        params: {
            query,
            page: pageGlobal,
        },
    });
    const movies = data.results;
    totalPages = data.total_pages;
    globalEndpoint = endpoint;
    return movies;
};

async function getMoviesByCategory(id) {
    getMovies({
        endpoint: 'discover/movie',
        query: {
            with_genres: id,
        },
    });
    createMovies(movies, genericSection, true);
}

const getPaginatedMovies = async ({ page, query, endpoint } = { page: 1 }) => {
    const movies = await getMovies({ query, endpoint });
    return movies;
};
document.addEventListener('scroll', async () => {
    const { clientHeight, scrollHeight, scrollTop } = document.documentElement;
    const scrollIsEnd = scrollTop + clientHeight >= scrollHeight - 15;
    if (scrollIsEnd && totalPages >= pageGlobal) {
        ++pageGlobal;

        const movies = await getPaginatedMovies({
            page: pageGlobal,
            query: globalQuery,
            endpoint: globalEndpoint,
        });
        createMovies(movies, genericSection, {
            lazy: true,
            infinity: true,
        });
    }
});

async function getMoviesBySearch(query) {
    console.log(query);
    const movies = await getMovies({ query, endpoint: '/' });
    createMovies(movies, genericSection, { lazy: true, infinity: true });
}
async function getTrendingMovies() {
    const movies = await getMovies({
        endpoint: 'trending/movie/day',
    });

    createMovies(movies, genericSection);
}
async function getMovieById(id) {
    const { data: movie } = await api('movie/' + id);

    const movieImgUrl = 'https://image.tmdb.org/t/p/w500' + movie.poster_path;
    console.log(movieImgUrl);
    headerSection.style.background = `
    linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.35) 19.27%,
      rgba(0, 0, 0, 0) 29.17%
    ),
    url(${movieImgUrl})
  `;

    movieDetailTitle.textContent = movie.title;
    movieDetailDescription.textContent = movie.overview;
    movieDetailScore.textContent = movie.vote_average;

    createCategories(movie.genres, movieDetailCategoriesList);

    getRelatedMoviesId(id);
}

async function getRelatedMoviesId(id) {
    const { data } = await api(`movie/${id}/recommendations`);
    const relatedMovies = data.results;

    createMovies(relatedMovies, relatedMoviesContainer);
}
